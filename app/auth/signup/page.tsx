"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");


  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username, // this goes into user_metadata
        },
      },
    });
    

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      "Signup successful! Check your email to confirm (or turn off email confirmation in Supabase while dev'ing)."
    );
    router.push("/auth/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-md bg-slate-800 p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-4">Create an account</h1>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-200 mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-md border border-slate-600 bg-slate-900 text-white px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
  <label className="block text-sm text-slate-200 mb-1">Username</label>
  <input
    type="text"
    className="w-full rounded-md border border-slate-600 bg-slate-900 text-white px-3 py-2"
    value={username}
    onChange={(e) => setUsername(e.target.value)}
    required
  />
</div>


          <div>
            <label className="block text-sm text-slate-200 mb-1">Password</label>
            <input
              type="password"
              className="w-full rounded-md border border-slate-600 bg-slate-900 text-white px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-md transition"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-sm text-slate-300 mt-4">
          Already have an account?{" "}
          <button
            type="button"
            className="text-emerald-400 underline"
            onClick={() => router.push("/auth/login")}
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
