import { useEffect } from "react";
import {
  BarChart3,
  CircleUser,
  Globe,
  History,
  Home,
  MessageCircle,
  Palette,
  ShoppingBag,
  Snowflake,
  Star,
  SunMoon,
  Utensils,
} from "lucide-react";

export default function App() {
  return (
    <div>
      <div className="bg-white text-zinc-950 w-full h-fit h-fit min-h-screen w-screen min-w-screen max-w-screen overflow-visible">
        <div className="relative bg-[linear-gradient(180deg,oklch(0.98_0.02_205)_0%,oklch(0.95_0.03_202)_34%,oklch(0.91_0.04_198)_100%)] flex mx-auto flex-col w-100.5 h-218.5 overflow-hidden">
          <div className="bg-[radial-gradient(circle_at_18%_10%,oklch(0.8596_0.146257_203.563/.34),transparent_24%),radial-gradient(circle_at_82%_14%,oklch(0.97_0.014_254.604/.24),transparent_20%),radial-gradient(circle_at_50%_52%,oklch(1_0_0/.18),transparent_44%)] absolute inset-0" />
          <div className="bg-[linear-gradient(180deg,oklch(1_0_0/.22)_0%,transparent_16%,oklch(1_0_0/.08)_100%)] absolute inset-0" />
          <div className="relative z-10 flex px-5 pt-5 justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="size-10 backdrop-blur-2xl shadow-[0_14px_34px_oklch(0.7_0.13_210/.18)] rounded-2xl bg-white/55 border-white/70 border-1 border-solid flex justify-center items-center">
                <Snowflake className="size-5 text-cyan-500" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-slate-950 text-[22px] tracking-tight">
                  Vyhod
                </span>
                <span className="max-w-[150px] font-medium text-slate-600 text-[11px] leading-4">
                  Track money, improve balance
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="size-10 backdrop-blur-2xl shadow-[0_14px_34px_oklch(0.7_0.13_210/.16)] rounded-2xl bg-white/55 border-white/70 border-1 border-solid flex justify-center items-center">
                <Palette className="size-4 text-slate-700" />
              </button>
              <button className="size-10 backdrop-blur-2xl shadow-[0_14px_34px_oklch(0.7_0.13_210/.16)] rounded-2xl bg-white/55 border-white/70 border-1 border-solid flex justify-center items-center">
                <Globe className="size-4 text-slate-700" />
              </button>
              <button className="size-10 backdrop-blur-2xl shadow-[0_14px_34px_oklch(0.7_0.13_210/.16)] rounded-2xl bg-white/55 border-white/70 border-1 border-solid flex justify-center items-center">
                <SunMoon className="size-4 text-slate-700" />
              </button>
              <button className="size-10 backdrop-blur-2xl shadow-[0_14px_34px_oklch(0.7_0.13_210/.16)] rounded-2xl bg-white/55 border-white/70 border-1 border-solid flex justify-center items-center">
                <CircleUser className="size-4 text-slate-700" />
              </button>
            </div>
          </div>
          <div className="relative z-10 overflow-y-auto flex px-5 py-4 flex-col flex-1 gap-4">
            <div className="backdrop-blur-2xl shadow-[0_20px_60px_oklch(0.7_0.13_210/.16)] rounded-3xl bg-white/42 border-white/70 border-1 border-solid p-4">
              <div className="flex justify-between items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="font-medium uppercase text-slate-500 text-xs leading-4 tracking-[5.12px]">
                    Difficulty
                  </span>
                  <span className="font-semibold text-slate-950 text-sm leading-5">
                    Choose your pace
                  </span>
                </div>
                <div className="backdrop-blur-xl shadow-[0_10px_24px_oklch(0.7_0.13_210/.12)] rounded-full bg-white/65 border-white/75 border-1 border-solid p-1">
                  <div className="flex items-center gap-1">
                    <button>Basic</button>
                    <button>Hard</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-[linear-gradient(135deg,oklch(1_0_0/.68),oklch(0.97_0.014_254.604/.42))] backdrop-blur-2xl shadow-[0_24px_70px_oklch(0.7_0.13_210/.18)] rounded-[28px] border-white/70 border-1 border-solid p-5">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 backdrop-blur-xl shadow-[0_10px_24px_oklch(0.7_0.13_210/.14)] rounded-2xl bg-white/65 border-white/75 border-1 border-solid flex justify-center items-center">
                    <BarChart3 className="size-5 text-cyan-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-950 text-sm leading-5">
                      Financial progress
                    </span>
                    <span className="text-slate-500 text-xs leading-4">
                      Your balance is improving
                    </span>
                  </div>
                </div>
                <div className="font-semibold shadow-[0_8px_18px_oklch(0.7_0.13_210/.08)] rounded-full bg-emerald-500/12 text-emerald-700 text-xs leading-4 px-3 py-1">
                  +12.4%
                </div>
              </div>
              <div className="backdrop-blur-xl shadow-[inset_0_1px_0_oklch(1_0_0/.7),0_18px_40px_oklch(0.7_0.13_210/.12)] rounded-3xl bg-white/50 border-white/75 border-1 border-solid mt-5 p-4">
                <div className="flex justify-between items-end gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500 text-xs leading-4">
                      Available to spend
                    </span>
                    <span className="font-semibold text-slate-950 text-3xl leading-9 tracking-tight">
                      $2,148.60
                    </span>
                  </div>
                  <div className="text-right shadow-[0_10px_20px_oklch(0.8596_0.146257_203.563/.12)] rounded-2xl bg-cyan-500/12 px-3 py-2">
                    <div className="font-medium text-slate-500 text-[11px]">
                      This month
                    </div>
                    <div className="font-semibold text-slate-950 text-sm leading-5">
                      Stable
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-7 mt-4 gap-2">
                  <div className="shadow-[inset_0_1px_0_oklch(1_0_0/.45),0_10px_18px_oklch(0.8596_0.146257_203.563/.12)] rounded-2xl bg-cyan-400/28 h-20" />
                  <div className="shadow-[inset_0_1px_0_oklch(1_0_0/.45),0_10px_18px_oklch(0.8596_0.146257_203.563/.12)] rounded-2xl bg-cyan-400/32 mt-4 h-16" />
                  <div className="shadow-[inset_0_1px_0_oklch(1_0_0/.45),0_10px_18px_oklch(0.8596_0.146257_203.563/.12)] rounded-2xl bg-cyan-400/36 mt-2 h-18" />
                  <div className="shadow-[inset_0_1px_0_oklch(1_0_0/.45),0_10px_18px_oklch(0.8596_0.146257_203.563/.12)] rounded-2xl bg-cyan-400/26 mt-6 h-12" />
                  <div className="shadow-[inset_0_1px_0_oklch(1_0_0/.45),0_10px_18px_oklch(0.8596_0.146257_203.563/.12)] rounded-2xl bg-cyan-400/34 mt-3 h-17" />
                  <div className="shadow-[inset_0_1px_0_oklch(1_0_0/.45),0_10px_18px_oklch(0.8596_0.146257_203.563/.12)] rounded-2xl bg-cyan-400/40 mt-1 h-19" />
                  <div className="shadow-[inset_0_1px_0_oklch(1_0_0/.45),0_10px_18px_oklch(0.8596_0.146257_203.563/.12)] rounded-2xl bg-cyan-400/28 mt-5 h-13" />
                </div>
                <div className="text-slate-500 text-[11px] flex mt-3 justify-between items-center">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>
            <div className="backdrop-blur-2xl shadow-[0_20px_60px_oklch(0.7_0.13_210/.16)] rounded-[28px] bg-white/42 border-white/70 border-1 border-solid p-5">
              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-slate-950 text-base leading-6">
                    Money categories
                  </span>
                  <span className="text-slate-500 text-xs leading-4">
                    Where your budget goes
                  </span>
                </div>
                <button className="font-semibold text-cyan-600 text-xs leading-4">
                  Edit
                </button>
              </div>
              <div className="grid grid-cols-2 mt-4 gap-3">
                <div className="backdrop-blur-xl shadow-[0_14px_34px_oklch(0.7_0.13_210/.12)] rounded-2xl bg-white/62 border-white/75 border-1 border-solid p-4">
                  <div className="flex justify-between items-center">
                    <div className="size-10 shadow-[inset_0_1px_0_oklch(1_0_0/.55)] rounded-2xl bg-cyan-500/12 text-cyan-600 flex justify-center items-center">
                      <ShoppingBag className="size-4" />
                    </div>
                    <Star />
                  </div>
                  <div className="text-slate-500 text-xs leading-4 mt-3">
                    Shopping
                  </div>
                  <div className="font-semibold text-slate-950 text-lg leading-7 mt-1">
                    $312.80
                  </div>
                </div>
                <div className="backdrop-blur-xl shadow-[0_14px_34px_oklch(0.7_0.13_210/.12)] rounded-2xl bg-white/62 border-white/75 border-1 border-solid p-4">
                  <div className="flex justify-between items-center">
                    <div className="size-10 shadow-[inset_0_1px_0_oklch(1_0_0/.55)] rounded-2xl bg-cyan-500/12 text-cyan-600 flex justify-center items-center">
                      <Utensils className="size-4" />
                    </div>
                    <Star />
                  </div>
                  <div className="text-slate-500 text-xs leading-4 mt-3">{`Food & Drink`}</div>
                  <div className="font-semibold text-slate-950 text-lg leading-7 mt-1">
                    $98.40
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative z-10 backdrop-blur-2xl bg-white/45 border-white/50 border-t-1 border-r-0 border-b-0 border-l-0 border-solid px-4 py-3">
            <div className="flex justify-around items-center">
              <button className="shadow-[0_12px_28px_oklch(0.7_0.13_210/.14)] rounded-2xl bg-white/75 text-cyan-600 flex px-4 py-2 flex-col items-center gap-1">
                <Home className="size-5" />
                <span className="font-semibold text-[11px]">Home</span>
              </button>
              <button className="text-slate-500 flex px-4 py-2 flex-col items-center gap-1">
                <MessageCircle className="size-5" />
                <span className="text-[11px]">Assistant</span>
              </button>
              <button className="text-slate-500 flex px-4 py-2 flex-col items-center gap-1">
                <History className="size-5" />
                <span className="text-[11px]">History</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
