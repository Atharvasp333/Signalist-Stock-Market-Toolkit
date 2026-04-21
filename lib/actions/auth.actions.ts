'use server';

import {auth} from "@/lib/better-auth/auth";
import {inngest} from "@/lib/inngest/client";
import {headers} from "next/headers";

export const signUpWithEmail = async ({ email, password, fullName, country, investmentGoals, riskTolerance, preferredIndustry }: SignUpFormData) => {
    try {
        const response = await auth.api.signUpEmail({ body: { email, password, name: fullName } })

        if(response) {
            await inngest.send({
                name: 'app/user.created',
                data: { email, name: fullName, country, investmentGoals, riskTolerance, preferredIndustry }
            })
        }

        return { success: true, data: response }
    } catch (e: any) {
        console.log('Sign up failed', e)
        
        // Handle specific error cases
        if (e?.message?.includes('already exists') || e?.message?.includes('duplicate')) {
            return { success: false, error: 'An account with this email already exists' }
        }
        
        if (e?.message?.includes('password')) {
            return { success: false, error: 'Password must be at least 8 characters long' }
        }
        
        if (e?.message?.includes('email') || e?.message?.includes('invalid')) {
            return { success: false, error: 'Please provide a valid email address' }
        }
        
        return { success: false, error: e?.message || 'Failed to create account. Please try again.' }
    }
}

export const signInWithEmail = async ({ email, password }: SignInFormData) => {
    try {
        const response = await auth.api.signInEmail({ body: { email, password } })

        return { success: true, data: response }
    } catch (e: any) {
        console.log('Sign in failed', e)
        
        // Handle specific error cases
        if (e?.message?.includes('Invalid email or password') || e?.message?.includes('credentials')) {
            return { success: false, error: 'Invalid email or password' }
        }
        
        if (e?.message?.includes('not found') || e?.message?.includes('does not exist')) {
            return { success: false, error: 'No account found with this email' }
        }
        
        if (e?.message?.includes('password')) {
            return { success: false, error: 'Incorrect password' }
        }
        
        return { success: false, error: e?.message || 'Failed to sign in. Please try again.' }
    }
}

export const signOut = async () => {
    try {
        await auth.api.signOut({ headers: await headers() });
    } catch (e) {
        console.log('Sign out failed', e)
        return { success: false, error: 'Sign out failed' }
    }
}
