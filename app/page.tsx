import Image from "next/image";
import { Appbar } from "./components/Appbar";


export default function Home() {
  return (
    <main>
      <Appbar/>

      <h1 className="bg-red-600">Hewmlo</h1>
    </main>
  );
}
