import { withAuth } from "next-auth/middleware";

export default withAuth({
  // 可以在这里配置回调，进行更细粒度的控制（例如只允许管理员访问）
  callbacks: {
    authorized: ({ token }) => {
      // 如果有 token (已登录)，返回 true，允许访问
      // 如果返回 false，会自动跳转到登录页
      console.log(token);
      return !!token;
    },
  },
  pages: {
    signIn: "/login", // 当用户未登录时，自动跳转到的页面路径
  },
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|login|register|favicon.ico).*)"],
};
