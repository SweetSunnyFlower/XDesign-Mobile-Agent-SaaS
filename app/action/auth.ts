"use server";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { z } from "zod";

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export async function register(formData: FormData) {
  const validatedFields = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
  });

  if (!validatedFields.success) {
    return {
      error: "error",
    };
  }

  const { email, password, name } = validatedFields.data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "User with this email already exists" };
  }

  // Hash password
  const hashedPassword = await hash(password, 12);

  // Create user
  try {
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Failed to create account" };
  }

  // redirect("/login");
}