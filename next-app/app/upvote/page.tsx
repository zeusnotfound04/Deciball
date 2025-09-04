import {UpVotForm} from "@/app/components/UpvoteForm";
import DarkGradientBackground from "@/components/Background";

export default function Page() {
    return (
        <DarkGradientBackground>
            <div className="min-h-screen">
                <UpVotForm/>
            </div>
        </DarkGradientBackground>
    );
}