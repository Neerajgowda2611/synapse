import NextAuth from "next-auth"
import Zitadel from "next-auth/providers/zitadel"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Zitadel({
      clientId: process.env.AUTH_ZITADEL_ID!,
      issuer: process.env.AUTH_ZITADEL_ISSUER!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist the access_token from the initial sign-in
      if (account?.access_token) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      // Expose the access_token to server components and API calls
      return {
        ...session,
        accessToken: token.accessToken as string,
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
