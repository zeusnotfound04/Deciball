import { DefaultSession , DefaultUser } from "next-auth";


declare module "next-auth" {
    interface Session extends DefaultSession {
        user: {
            id: string;
            username : string ;
            email: string;
            name?: String;
            pfpUrl?: string | null;
        };
    }

    interface User extends DefaultUser {
        id: string;
        email: string;
        username : string ;
        pfpUrl?: string | null;
        name ?: string ;

    }
}


declare module "next-auth/jwt" {
    interface JWT {
      id: string;
      email: string;
      username : string ;
      pfpUrl?: string | null;
      name ?: string ;
    }
  }