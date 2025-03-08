import { useSocket } from "@/context/socket-context";



type Props = {
    queue: Video[];
    creatorId: string;
    userId: string;
    isCreator: boolean;
    spaceId:string
  };


export default function Queue({ queue , isCreator , creatorId , userId , spaceId} : Props) {
    const {sendMessage } = useSocket();
    const [ isEmptyQueueDialogOpen , setIsEmp]
}