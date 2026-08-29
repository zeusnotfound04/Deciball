
import DarkGradientBackground from "@/components/Background";

export default function Page() {    
    return (
        <DarkGradientBackground>
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="font-serif italic text-[48px] text-paper-white mb-4">Home Page</h1>
                    <p className="font-satoshi text-[17px] text-steel-gray">Welcome to Deciball Home</p>
                </div>
            </div>
        </DarkGradientBackground>
    );
}