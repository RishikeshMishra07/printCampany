"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const [authData, setAuthData] = useState({ employee_id: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [userType, setUserType] = useState("user");
  const [department, setDepartment] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: authData.employee_id,
          password: authData.password,
          role: userType,
          department: userType === 'user' ? department : null
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert(`Welcome, ${data.user.name || data.user.employee_id}!`);
        if (data.user.role === 'user') {
          const dept = data.user.department_name || department;
          let path = 'general';
          if (dept === 'Printing') path = 'printing';
          else if (dept === 'Quality Control (QC)') path = 'qc';
          else if (dept === 'Dispatch') path = 'dispatch';

          router.push(`/dashboard/${path}`);
        } else {
          router.push('/dashboard');
        }
      } else {
        alert(`Login failed: ${data.message}`);
      }
    } catch (error) {
      alert('Error connecting to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm sm:max-w-md lg:max-w-[350px] bg-background lg:bg-transparent rounded-2xl lg:rounded-none shadow-xl lg:shadow-none border border-border lg:border-transparent p-5 sm:p-8 lg:p-0 grid gap-6 sm:gap-8 transition-all">
      <div className="grid gap-2 text-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Login</h1>
        <p className="text-muted-foreground text-xs sm:text-sm lg:text-base">
          Enter your credentials below to access your dashboard
        </p>
      </div>

      <form onSubmit={handleLogin} className="grid gap-5 sm:gap-6">

        {/* Custom Shadcn-like Tabs for Role */}
        <div className="grid gap-2">
          <label className="text-sm font-medium leading-none text-foreground">Account Type</label>
          <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full">
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setUserType('user')}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${userType === 'user' ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'
                } w-1/2`}
            >
              User
            </button>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setUserType('admin')}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${userType === 'admin' ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'
                } w-1/2`}
            >
              Admin
            </button>
          </div>
        </div>

        {/* Department Dropdown (Only for Users) */}
        {userType === 'user' && (
          <div className="grid gap-2">
            <label className="text-sm font-medium leading-none text-foreground">Department</label>
            <select
              required
              suppressHydrationWarning
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select Department</option>
              <option value="Printing">Printing</option>
              <option value="QC">Quality Control (QC)</option>
              <option value="Dispatch">Dispatch</option>
              <option value="Management">Management</option>
            </select>
          </div>
        )}

        {/* Emp ID Input */}
        <div className="grid gap-2">
          <label className="text-sm font-medium leading-none text-foreground">Emp ID</label>
          <input
            type="text"
            required
            suppressHydrationWarning
            placeholder="Enter your Emp ID"
            value={authData.employee_id}
            onChange={e => setAuthData({ ...authData, employee_id: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Password Input */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between w-full">
            <label className="text-sm font-medium leading-none text-foreground">Password</label>
            <a href="#" className="inline-block text-sm underline text-muted-foreground hover:text-primary">
              Forgot your password?
            </a>
          </div>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              required
              suppressHydrationWarning
              placeholder="••••••••"
              value={authData.password}
              onChange={e => setAuthData({ ...authData, password: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-12"
            />
            <button
              type="button"
              suppressHydrationWarning
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowPwd(!showPwd)}
            >
              {showPwd ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          suppressHydrationWarning
          disabled={isLoading}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full mt-2"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Signing in...
            </span>
          ) : 'Sign In'}
        </button>

      </form>
    </div>
  );
}
