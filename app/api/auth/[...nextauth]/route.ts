import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "chef@gourmetai.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Standard credentials mock validation.
        // In a real application, we would check Neon Postgres or Strapi.
        if (credentials?.email && credentials?.password) {
          return {
            id: "user_1",
            name: credentials.email.split("@")[0].charAt(0).toUpperCase() + credentials.email.split("@")[0].slice(1),
            email: credentials.email,
            image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop"
          };
        }
        return null;
      }
    })
  ],
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "gourmet-secret-key-12345"
});

export { handler as GET, handler as POST };
