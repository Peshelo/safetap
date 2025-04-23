"use client"
import pb from "../connection";
import { useRouter } from "next/navigation";

export default async function useLogout() {
    const router = useRouter();
    pb.authStore.clear();
    router.push('/auth/login');
}
