import { hash } from 'bcrypt';
import { NextResponse } from 'next/server';
import z from "zod";
import {prisma} from "@/app/lib/db";

const userSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });
  



 type UserRequestBody = z.infer<typeof userSchema>;
 
 export async function POST(req: Request){
    try {
        const body : UserRequestBody = await req.json();

        const parsedBody = userSchema.parse(body);

        const {email , username , password} = parsedBody;

        const findUser = await prisma.user.findUnique({
            where: {
                email
            }
        });

        if(findUser){
            return NextResponse.json(
                {
                    error: "User already exists"
                },
                {
                    status: 400            

                });
        }

        const hashedPassword = await hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                provider : "Credentials"
            }
        });

        return NextResponse.json(
            {
                message : "User created successfully",
                user: newUser
            },
            {
                status: 201
            }
        );

        

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: error.errors
                },
                {
                    status: 400
                }
            );
        }

        console.error("Error Creating the user " , error);

        return NextResponse.json({
            message : "Error Creating the user",
            error: error instanceof Error ?error.message : "An Unknown Error occurred"
        },{status: 500

        })
    }
 }