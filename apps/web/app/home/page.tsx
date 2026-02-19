
import DarkGradientBackground from "@/components/Background";

export default function Page() {    
    return (
        <DarkGradientBackground>
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-white mb-4">Home Page</h1>
                    <p className="text-zinc-400">Welcome to Deciball Home</p>
                </div>
            </div>
        </DarkGradientBackground>
    );
}