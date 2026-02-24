import { withAuth } from "next-auth/middleware"

export default withAuth({
    pages: {
        signIn: "/login",
    },
})

export const config = {
    matcher: ["/", "/projects/:path*", "/tasks/:path*", "/users/:path*", "/documents/:path*"],
}
