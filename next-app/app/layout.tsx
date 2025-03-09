
import type { Metadata } from "next";
import "./globals.css";
import SessionProviderWrapper from "./SessionProviderWrapper";
// import Container from "./components/ui/Container";
// import { SocketContextProvider } from "@/context/socket-context";
import { Providers } from "./provider";


export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {/* <SessionProviderWrapper> */}
          {/* <Container> */}
           {/* <SocketContextProvider> */}
<Providers>

{children}
</Providers>
           {/* </SocketContextProvider> */}
           
          {/* </Container> */}
        {/* </SessionProviderWrapper> */}
       
      </body>
    </html>
  );
}
