import Link from "next/link";
import { ArrowRight, Store, LayoutDashboard, ShieldCheck, Zap, Globe, CreditCard } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-950">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-stone-800 bg-stone-950/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">O</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
              OroNext
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              className="px-5 py-2.5 text-sm font-medium text-stone-300 hover:text-white transition-colors"
              href="/login"
            >
              Sign In
            </Link>
            <Link
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg text-sm font-medium hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-500/20"
              href="/login"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative w-full py-20 md:py-32 lg:py-40 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 via-transparent to-transparent" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />

          <div className="container relative mx-auto px-6">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium">
                <Zap size={16} />
                The Gold Standard in POS
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight text-white max-w-4xl leading-tight">
                Manage Your Business with{" "}
                <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                  OroNext
                </span>
              </h1>

              <p className="mx-auto max-w-2xl text-lg md:text-xl text-stone-400 leading-relaxed">
                The all-in-one POS and management solution for modern businesses.
                Streamline operations, track performance, and grow your revenue.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-8 text-base font-semibold text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all hover:scale-105"
                  href="/login"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-700 bg-stone-900/50 px-8 text-base font-semibold text-stone-300 hover:bg-stone-800 hover:text-white transition-all"
                  href="/login"
                >
                  Watch Demo
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-20 md:py-28 border-t border-stone-800">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Everything You Need to Succeed
              </h2>
              <p className="text-stone-400 text-lg max-w-2xl mx-auto">
                Powerful features designed for modern retail and service businesses
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Store,
                  title: "Multi-Location Support",
                  description: "Seamlessly manage multiple locations from a single dashboard with real-time sync."
                },
                {
                  icon: LayoutDashboard,
                  title: "Real-Time Analytics",
                  description: "Get instant insights into sales, inventory, and employee performance metrics."
                },
                {
                  icon: ShieldCheck,
                  title: "Role-Based Security",
                  description: "Secure access control for Owners, Managers, and Employees with audit trails."
                },
                {
                  icon: CreditCard,
                  title: "Integrated Payments",
                  description: "Accept all payment methods with built-in PAX terminal integration."
                },
                {
                  icon: Globe,
                  title: "Offline Mode",
                  description: "Keep selling even when the internet goes down. Auto-sync when back online."
                },
                {
                  icon: Zap,
                  title: "Lightning Fast",
                  description: "Optimized for speed. Check out customers in seconds, not minutes."
                }
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="relative group p-6 rounded-2xl bg-stone-900/50 border border-stone-800 hover:border-orange-500/30 transition-all hover:bg-stone-900"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center text-orange-400 mb-4">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-stone-400">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-20 border-t border-stone-800">
          <div className="container mx-auto px-6">
            <div className="relative rounded-3xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 p-12 md:p-16 text-center overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl" />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Ready to Transform Your Business?
                </h2>
                <p className="text-stone-400 text-lg mb-8 max-w-xl mx-auto">
                  Join thousands of businesses already using OroNext to streamline their operations.
                </p>
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-8 text-base font-semibold text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all hover:scale-105"
                  href="/login"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800 py-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">O</span>
            </div>
            <span className="text-lg font-bold text-white">OroNext</span>
          </div>
          <p className="text-sm text-stone-500">
            © 2025 OroNext Systems. All rights reserved.
          </p>
          <nav className="flex gap-6">
            <Link className="text-sm text-stone-400 hover:text-white transition-colors" href="#">
              Terms
            </Link>
            <Link className="text-sm text-stone-400 hover:text-white transition-colors" href="#">
              Privacy
            </Link>
            <Link className="text-sm text-stone-400 hover:text-white transition-colors" href="#">
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
