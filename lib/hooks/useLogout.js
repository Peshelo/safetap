"use client"
import api from "../connection";
import { useRouter } from "next/navigation";

export default async function useLogout() {
    const router = useRouter();
    await api.authStore.clear();
    router.replace('/(auth)/initial');
}
