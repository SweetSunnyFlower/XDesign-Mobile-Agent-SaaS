import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      // 这里定义的 credentials 用于在默认登录页生成表单（如果你自定义登录页，这里可以忽略）
      credentials: {
        email: {
          label: "Email",
          type: "text",
          placeholder: "test@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      // 核心认证逻辑
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("请输入邮箱和密码");
        }

        const email = credentials.email;
        const user = await prisma.user.findFirst({
          where: {
            email,
          },
        });
        if (!user) {
          throw new Error("用户不存在");
        }

        // 3. 验证密码 (比对明文密码和数据库中的哈希密码)
        const isPasswordCorrect = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordCorrect) {
          throw new Error("密码错误");
        }

        // 4. 返回用户信息 (注意：不要返回密码字段)
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          // 如果需要传递额外字段，见下文 callbacks 配置
        };
      },
    }),
  ],
  // 自定义登录页面路径
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt", // 使用 JWT 策略
  },
  callbacks: {
    // 将用户 ID 或其他信息存入 JWT
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // token.role = user.role; // 如果有角色字段
      }
      return token;
    },
    // 将 JWT 中的信息存入 Session，这样在前端 useSession 中能取到
    async session({ session, token }) {
      if (session.user) {
        // @ts-ignore // 或者扩展类型定义
        session.user.id = token.id as string;
        // session.user.role = token.role;
      }
      return session;
    },
  },
};
