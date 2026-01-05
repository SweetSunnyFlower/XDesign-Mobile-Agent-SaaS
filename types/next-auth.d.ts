// types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  /**
   * 扩展 Session 接口
   * 这里的 user 属性会合并到默认的 Session['user'] 中
   */
  interface Session {
    user: {
      id: string;
      // role?: string; // 如果你需要角色字段
    } & DefaultSession["user"]
  }

  /**
   * 扩展 User 接口 (authorize 函数返回的类型)
   */
  interface User {
    id: string;
    // role?: string;
  }
}

declare module "next-auth/jwt" {
  /**
   * 扩展 JWT 接口
   */
  interface JWT {
    id: string;
    // role?: string;
  }
}