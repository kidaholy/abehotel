import jwt from "jsonwebtoken"
import User from "@/lib/models/user"
import { connectDB } from "@/lib/db"

export interface TokenPayload {
    id: string
    email?: string
    role: string
    floorId?: string
    permissions?: string[]
    [key: string]: any
}

function getSecret() {
    return process.env.JWT_SECRET || "your-secret-key-change-this-in-production"
}

export function signToken(payload: TokenPayload): string {
    return jwt.sign(payload, getSecret(), {
        expiresIn: "7d",
    })
}

export function verifyToken(token: string): TokenPayload {
    return jwt.verify(token, getSecret()) as TokenPayload
}

/**
 * Validates the session token AND checks if the user is still active in the database.
 * Throws an error if invalid or inactive.
 * Uses a lightweight in-memory cache to reduce DB load for frequent polling.
 */
const sessionCache = new Map<string, { isActive: boolean; timestamp: number }>()
const CACHE_TTL = 600000 // 10 minutes — reduce DB hits significantly

export async function validateSession(request: Request): Promise<TokenPayload> {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token || token.trim() === "" || token === "undefined" || token === "null") {
        throw new Error("Unauthorized: No valid session token provided")
    }

    try {
        const decoded = verifyToken(token)

        // Serve from cache if fresh — avoids DB round-trip on every poll
        const cached = sessionCache.get(decoded.id)
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
            if (!cached.isActive) {
                throw new Error("Unauthorized: Account deactivated. Please contact administrator.")
            }
            return decoded
        }

        // Try DB check — but if DB is unreachable and we have a stale cache entry, use it
        try {
            await connectDB()
            const user = await User.findById(decoded.id).select("isActive name email").lean()

            if (!user) {
                throw new Error("Unauthorized: User no longer exists")
            }

            sessionCache.set(decoded.id, {
                isActive: user.isActive !== false,
                timestamp: Date.now()
            })

            if (user.isActive === false) {
                throw new Error("Unauthorized: Account deactivated. Please contact administrator.")
            }
        } catch (dbError: any) {
            // If it's an auth error, rethrow it
            if (dbError.message?.startsWith("Unauthorized")) throw dbError

            // DB is unreachable — if we have ANY cached entry (even stale), trust the JWT
            if (cached) {
                console.warn(`⚠️ validateSession - DB unreachable, using stale cache for ${decoded.id}`)
                if (!cached.isActive) throw new Error("Unauthorized: Account deactivated.")
                return decoded
            }

            // No cache at all and DB is down — trust the JWT alone
            console.warn(`⚠️ validateSession - DB unreachable, trusting JWT for ${decoded.id}`)
        }

        return decoded
    } catch (error: any) {
        if (error.name === "TokenExpiredError") {
            throw new Error("Unauthorized: Session expired")
        }
        throw error
    }
}
