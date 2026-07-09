import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
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
          const name = credentials.email.split("@")[0];
          return {
            id: credentials.email,
            name: name.charAt(0).toUpperCase() + name.slice(1),
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
  secret: process.env.NEXTAUTH_SECRET || "gourmet_recipe_platform_secure_secret_key_2026_x"
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
