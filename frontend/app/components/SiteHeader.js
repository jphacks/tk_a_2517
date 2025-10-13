"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="site-header">
      <div className="site-header-left">
        <button className="menu-btn" aria-label="menu">☰</button>
      </div>
      <div className="site-header-center">
        <h1 className="site-title">QRally</h1>
      </div>
      <div className="site-header-right">
        {pathname === "/prize" ? (
          <button className="header-action" onClick={() => router.back()}>戻る</button>
        ) : (
          <Link href="/prize" className="header-action">ポイント交換</Link>
        )}
      </div>
    </header>
  );
}
