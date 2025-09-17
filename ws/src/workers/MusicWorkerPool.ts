import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export interface WorkerTask {
    id: string;
    type: 'fetch-song-details' | 'batch-process' | 'verify-song' | 'extract-metadata';
    data: any;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timestamp: number;
    timeout?: NodeJS.Timeout;
    priority?: 'high' | 'normal' | 'low';
}

export interface WorkerPoolStats {
    totalWorkers: number;
    availableWorkers: number;
    activeWorkers: number;
    queuedTasks: number;
    totalTasksProcessed: number;
    averageTaskTime: number;
    errorRate: number;
    memoryUsage?: {
        rss: number;
        heapUsed: number;
        heapTotal: number;
    };
}

export class MusicWorkerPool extends EventEmitter {
    private workers: Worker[] = [];
    private availableWorkers: Worker[] = [];
    private taskQueue: WorkerTask[] = [];
    private priorityTaskQueue: WorkerTask[] = []; // High priority tasks
    private workerTasks: Map<Worker, WorkerTask> = new Map();
    private readonly maxWorkers: number;
    private readonly workerScript: string;
    private taskStats: {
        totalProcessed: number;
        totalTime: number;
        errors: number;
    } = { totalProcessed: 0, totalTime: 0, errors: 0 };

    private readonly TASK_TIMEOUT = parseInt(process.env.TASK_TIMEOUT || '30000', 10);

    constructor(maxWorkers?: number) {
        super();
        const cpuCount = os.cpus().length;
        
        const envMaxWorkers = process.env.MAX_WORKERS ? parseInt(process.env.MAX_WORKERS, 10) : undefined;
        const instanceType = (process.env.INSTANCE_TYPE as 't2.micro' | 't2.small' | 't2.medium' | 't3.small' | 'auto') || 'auto';
        if (maxWorkers !== undefined) {
            this.maxWorkers = Math.max(1, Math.min(maxWorkers, 4));
        } else if (envMaxWorkers !== undefined && !isNaN(envMaxWorkers)) {
            this.maxWorkers = Math.max(1, Math.min(envMaxWorkers, 4)); 
        } else {
            this.maxWorkers = MusicWorkerPool.getOptimalWorkerCount(instanceType);
        }
        
        if (cpuCount <= 2) {
            console.log(`[WorkerPool] Low resource environment (t2.small/micro) - optimized for ${this.maxWorkers} worker(s)`);
        } else if (cpuCount <= 4) {
            console.log(`[WorkerPool] Medium resource environment - using ${this.maxWorkers} worker(s)`);
        } else {
            console.log(`[WorkerPool] High resource environment - using ${this.maxWorkers} worker(s)`);
        }
        
        const possiblePaths = [
            path.resolve(__dirname, 'musicWorker.js'),
            path.resolve(__dirname, './musicWorker.js'),
            path.resolve(__dirname, '../workers/musicWorker.ts'),
            path.resolve(__dirname, './musicWorker.ts'),
            // Fallback paths
            path.join(__dirname, 'musicWorker.js'),
            path.join(__dirname, '..', 'workers', 'musicWorker.ts')
        ];
        
        let foundPath = null;
        for (const possiblePath of possiblePaths) {
            if (fs.existsSync(possiblePath)) {
                foundPath = possiblePath;
                break;
            }
        }
        
        if (foundPath) {
            this.workerScript = foundPath;
            
        } else {
            this.workerScript = path.resolve(__dirname, 'musicWorker.js');
            console.error(`[WorkerPool]  Worker script not found in any expected location. Using fallback: ${this.workerScript}`);
            console.error(`[WorkerPool] __dirname: ${__dirname}`);
            console.error(`[WorkerPool] Searched paths:`, possiblePaths);
        }
        
        if (this.workerScript.endsWith('.ts') && this.workerScript.includes('/dist/')) {
            const jsPath = this.workerScript.replace('.ts', '.js');
            console.warn(`[WorkerPool]  Detected .ts file in dist directory, converting to .js: ${jsPath}`);
            this.workerScript = jsPath;
        }
        
        
        this.initializeWorkers();
    }

    private initializeWorkers(): void {
        for (let i = 0; i < this.maxWorkers; i++) {
            this.createWorker(i);
        }
        
    }

    private createWorker(workerId: number): Worker {
        try {
            
            
            if (!fs.existsSync(this.workerScript)) {
                throw new Error(`Worker script not found: ${this.workerScript}`);
            }
            
            const isCompiledVersion = this.workerScript.endsWith('.js');
            
            let worker: Worker;
            if (isCompiledVersion) {
                console.log(`[WorkerPool] Using compiled worker (no ts-node): ${this.workerScript}`);
                worker = new Worker(this.workerScript, {
                    workerData: { workerId }
                });
            } else {
                console.log(`[WorkerPool] Using TypeScript worker (with ts-node): ${this.workerScript}`);
                worker = new Worker(this.workerScript, {
                    workerData: { workerId },
                    execArgv: ['--require', 'ts-node/register']
                });
            }
            
            worker.on('message', (result) => {
                const task = this.workerTasks.get(worker);
                if (task) {
                    this.handleWorkerResponse(worker, task, result);
                }
            });

            worker.on('error', (error) => {
                console.error(`[WorkerPool] Worker ${workerId} error:`, error);
                this.handleWorkerError(worker, error);
            });

            worker.on('exit', (exitCode) => {
                if (exitCode !== 0) {
                    console.error(`[WorkerPool] Worker ${workerId} exited with code ${exitCode}`);
                    this.handleWorkerExit(worker);
                }
            });

            this.workers.push(worker);
            this.availableWorkers.push(worker);

            
            return worker;
        } catch (error) {
            console.error(`[WorkerPool]  Failed to create worker ${workerId}:`, error);
            console.error(`[WorkerPool] Worker script path: ${this.workerScript}`);
            console.error(`[WorkerPool] __dirname: ${__dirname}`);
            throw error;
        }
    }

    private handleWorkerResponse(worker: Worker, task: WorkerTask, result: any): void {
        const processingTime = Date.now() - task.timestamp;
        
        if (task.timeout) {
            clearTimeout(task.timeout);
        }

        this.workerTasks.delete(worker);
        this.availableWorkers.push(worker);

        this.taskStats.totalProcessed++;
        this.taskStats.totalTime += processingTime;

        if (result.success) {
            console.log(`[WorkerPool] ✅ Task ${task.id} completed (${processingTime}ms)`);
            task.resolve(result.data);
        } else {
            console.log(`[WorkerPool] ❌ Task ${task.id} failed: ${result.error} (${processingTime}ms)`);
            this.taskStats.errors++;
            task.reject(new Error(result.error));
        }

        // Process next task in queue
        this.processNextTask();
    }

    private handleWorkerError(worker: Worker, error: Error): void {
        const task = this.workerTasks.get(worker);
        if (task) {
            if (task.timeout) {
                clearTimeout(task.timeout);
            }
            task.reject(error);
            this.workerTasks.delete(worker);
            this.taskStats.errors++;
        }
        
        // Replace failed worker
        this.replaceWorker(worker);
    }

    private handleWorkerExit(worker: Worker): void {
        const task = this.workerTasks.get(worker);
        if (task) {
            if (task.timeout) {
                clearTimeout(task.timeout);
            }
            task.reject(new Error('Worker exited unexpectedly'));
            this.workerTasks.delete(worker);
            this.taskStats.errors++;
        }
        
        // Replace exited worker
        this.replaceWorker(worker);
    }

    private replaceWorker(failedWorker: Worker): void {
        try {
            // Remove from arrays
            const workerIndex = this.workers.indexOf(failedWorker);
            if (workerIndex !== -1) {
                this.workers.splice(workerIndex, 1);
            }
            
            const availableIndex = this.availableWorkers.indexOf(failedWorker);
            if (availableIndex !== -1) {
                this.availableWorkers.splice(availableIndex, 1);
            }

            // Terminate the failed worker
            failedWorker.terminate().catch(console.error);

            // Create replacement
            const newWorkerId = this.workers.length;
            this.createWorker(newWorkerId);
            
            
        } catch (error) {
            console.error('[WorkerPool]  Error replacing worker:', error);
        }
    }

    private processNextTask(): void {
        if (this.availableWorkers.length === 0) {
            return;
        }

        // Process high priority tasks first
        let task = this.priorityTaskQueue.shift();
        if (!task) {
            task = this.taskQueue.shift();
        }

        if (!task) {
            return;
        }

        const worker = this.availableWorkers.shift()!;
        this.workerTasks.set(worker, task);

        // Set task timeout
        task.timeout = setTimeout(() => {
            
            if (this.workerTasks.has(worker)) {
                this.workerTasks.delete(worker);
                this.taskStats.errors++;
                task!.reject(new Error('Task timeout'));
                
                // Terminate and replace timed out worker
                worker.terminate().catch(console.error);
                this.replaceWorker(worker);
            }
        }, this.TASK_TIMEOUT);

        // Send task to worker
        try {
            worker.postMessage({
                taskId: task.id,
                type: task.type,
                data: task.data
            });
            
            
        } catch (error) {
            console.error(`[WorkerPool]  Error sending task to worker:`, error);
            if (task.timeout) {
                clearTimeout(task.timeout);
            }
            this.workerTasks.delete(worker);
            this.availableWorkers.push(worker);
            task.reject(error);
        }
    }

    private addTask(task: WorkerTask): void {
        if (task.priority === 'high') {
            this.priorityTaskQueue.push(task);
        } else {
            this.taskQueue.push(task);
        }
        this.processNextTask();
    }

    async processSong(songData: any, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<any> {
        return new Promise((resolve, reject) => {
            const task: WorkerTask = {
                id: `song_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'fetch-song-details',
                data: songData,
                resolve,
                reject,
                timestamp: Date.now(),
                priority
            };

            this.addTask(task);
        });
    }
    async processBatch(songs: any[], priority: 'high' | 'normal' | 'low' = 'normal'): Promise<any[]> {
        if (songs.length === 0) {
            return [];
        }

        
        const startTime = Date.now();
        
        try {
            // Create promises for all songs
            const promises = songs.map((song, index) => 
                this.processSong({
                    ...song,
                    batchIndex: index,
                    batchTotal: songs.length
                }, priority)
            );
            
            // Use Promise.allSettled to handle partial failures
            const results = await Promise.allSettled(promises);
            
            const successful = results
                .filter(result => result.status === 'fulfilled')
                .map(result => (result as PromiseFulfilledResult<any>).value);
            
            const failed = results.filter(result => result.status === 'rejected').length;
            const processingTime = Date.now() - startTime;
            
            console.log(`[WorkerPool] ✅ Batch completed: ${successful.length} successful, ${failed} failed (${processingTime}ms)`);
            
            return successful;
        } catch (error) {
            console.error('[WorkerPool] ❌ Batch processing error:', error);
            throw error;
        }
    }

    // Verify song availability (lightweight check)
    async verifySong(songData: any): Promise<boolean> {
        try {
            const result = await new Promise<any>((resolve, reject) => {
                const task: WorkerTask = {
                    id: `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    type: 'verify-song',
                    data: songData,
                    resolve,
                    reject,
                    timestamp: Date.now(),
                    priority: 'high' // Verification should be fast
                };

                this.addTask(task);
            });

            return result?.available || false;
        } catch (error) {
            console.error('[WorkerPool] ❌ Song verification error:', error);
            return false;
        }
    }

    // Extract metadata without full processing
    async extractMetadata(songData: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const task: WorkerTask = {
                id: `metadata_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'extract-metadata',
                data: songData,
                resolve,
                reject,
                timestamp: Date.now(),
                priority: 'normal'
            };

            this.addTask(task);
        });
    }

    // Get comprehensive pool statistics
    getStats(): WorkerPoolStats {
        const totalTasks = this.taskStats.totalProcessed;
        const memUsage = process.memoryUsage();
        
        return {
            totalWorkers: this.workers.length,
            availableWorkers: this.availableWorkers.length,
            activeWorkers: this.workerTasks.size,
            queuedTasks: this.taskQueue.length + this.priorityTaskQueue.length,
            totalTasksProcessed: totalTasks,
            averageTaskTime: totalTasks > 0 ? this.taskStats.totalTime / totalTasks : 0,
            errorRate: totalTasks > 0 ? (this.taskStats.errors / totalTasks) * 100 : 0,
            memoryUsage: {
                rss: Math.round(memUsage.rss / 1024 / 1024), // MB
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) // MB
            }
        };
    }

    // Health check
    async healthCheck(): Promise<boolean> {
        try {
            const healthPromises = this.availableWorkers.slice(0, 2).map(worker => 
                new Promise<boolean>((resolve) => {
                    const timeout = setTimeout(() => resolve(false), 5000);
                    
                    const handler = (message: any) => {
                        if (message.type === 'health-check-response') {
                            clearTimeout(timeout);
                            worker.off('message', handler);
                            resolve(true);
                        }
                    };
                    
                    worker.on('message', handler);
                    worker.postMessage({ type: 'health-check' });
                })
            );

            if (healthPromises.length === 0) {
                return this.workers.length > 0; // At least some workers exist
            }

            const results = await Promise.all(healthPromises);
            return results.some(result => result === true);
        } catch (error) {
            console.error('[WorkerPool] ❌ Health check failed:', error);
            return false;
        }
    }

    // Graceful shutdown
    async shutdown(): Promise<void> {
        
        
        try {
            // Stop accepting new tasks
            this.taskQueue.length = 0;
            this.priorityTaskQueue.length = 0;

            // Wait for active tasks to complete (with timeout)
            const activeTaskPromises = Array.from(this.workerTasks.values()).map(task => 
                new Promise<void>((resolve) => {
                    const originalResolve = task.resolve;
                    const originalReject = task.reject;
                    
                    task.resolve = (value) => {
                        originalResolve(value);
                        resolve();
                    };
                    
                    task.reject = (error) => {
                        originalReject(error);
                        resolve();
                    };

                    // Force resolve after timeout
                    setTimeout(resolve, 10000); // 10 second timeout
                })
            );

            if (activeTaskPromises.length > 0) {
                
                await Promise.all(activeTaskPromises);
            }

            // Terminate all workers
            const terminationPromises = this.workers.map(worker => 
                worker.terminate().catch(error => 
                    console.error('[WorkerPool] ❌ Error terminating worker:', error)
                )
            );

            await Promise.all(terminationPromises);
            
            // Clear arrays
            this.workers.length = 0;
            this.availableWorkers.length = 0;
            this.workerTasks.clear();

            
        } catch (error) {
            console.error('[WorkerPool] ❌ Error during shutdown:', error);
            throw error;
        }
    }

    // Scale workers up or down
    async scaleWorkers(targetCount: number): Promise<void> {
        const currentCount = this.workers.length;
        
        if (targetCount === currentCount) {
            return;
        }

        if (targetCount > currentCount) {
            // Scale up
            const addCount = targetCount - currentCount;
            
            
            for (let i = 0; i < addCount; i++) {
                this.createWorker(currentCount + i);
            }
        } else {
            // Scale down
            const removeCount = currentCount - targetCount;
            
            
            for (let i = 0; i < removeCount; i++) {
                const worker = this.availableWorkers.pop();
                if (worker) {
                    const index = this.workers.indexOf(worker);
                    if (index !== -1) {
                        this.workers.splice(index, 1);
                    }
                    await worker.terminate();
                }
            }
        }
    }

    // Quick method to set worker count optimized for different instance types
    static getOptimalWorkerCount(instanceType: 't2.micro' | 't2.small' | 't2.medium' | 't3.small' | 'auto' = 'auto'): number {
        const cpuCount = os.cpus().length;
        
        switch (instanceType) {
            case 't2.micro':
                return 1; // Single worker for t2.micro (1 vCPU)
            case 't2.small':
                return 1; // Single worker for t2.small (1 vCPU burstable to 2)
            case 't2.medium':
                return 2; // Two workers for t2.medium (2 vCPUs)
            case 't3.small':
                return 2; // Two workers for t3.small (2 vCPUs with better baseline)
            case 'auto':
            default:
                // Conservative auto-detection for production stability
                if (cpuCount <= 2) {
                    return 1; // Low resource instances
                } else if (cpuCount <= 4) {
                    return 2; // Medium resource instances
                } else {
                    return Math.min(4, cpuCount - 1); // High resource instances, but cap at 4
                }
        }
    }
}
