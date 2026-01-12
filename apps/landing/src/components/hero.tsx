// "use client";

// import React from "react";
// import { motion } from "framer-motion";
// import { Button } from "./ui/button";

// export default function Hero() {
//   const containerVariants = {
//     hidden: { opacity: 0 },
//     visible: {
//       opacity: 1,
//       transition: {
//         staggerChildren: 0.1,
//       },
//     },
//   };

//   const itemVariants = {
//     hidden: { opacity: 0, y: 20 },
//     visible: { 
//       opacity: 1, 
//       y: 0,
//       transition: { 
//         duration: 0.6,
//         ease: "easeOut"
//       } 
//     },
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center px-4">
//       <motion.div
//         className="w-full max-w-4xl mx-auto text-center"
//         initial="hidden"
//         variants={containerVariants}
//         whileInView="visible"
//         viewport={{ once: true }}
//       >
//         <motion.h1
//           className="text-4xl md:text-6xl font-bold mb-6 text-gray-900"
//           variants={itemVariants}
//         >
//           Build Better Products,
//           <span className="block text-gray-600 mt-2">Faster with March</span>
//         </motion.h1>
        
//         <motion.p 
//           className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto"
//           variants={itemVariants}
//         >
//           An all-in-one platform that helps you build, launch, and grow your SaaS business with powerful tools and insights.
//         </motion.p>
        
//         <motion.div 
//           className="flex flex-col sm:flex-row gap-4 justify-center"
//           variants={itemVariants}
//         >
//           <Button 
//             className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
//             size="lg"
//           >
//             Get Started for Free
//           </Button>
//           <Button 
//             variant="outline" 
//             className="border-gray-300 text-gray-700 px-8 py-3 text-lg rounded-full hover:bg-gray-50 transition-colors"
//             size="lg"
//           >
//             Book a Demo
//           </Button>
//         </motion.div>
        
//         <motion.div 
//           className="mt-16 rounded-xl overflow-hidden shadow-2xl border border-gray-100"
//           variants={itemVariants}
//         >
//           <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
//             <div className="text-center p-8">
//               <div className="text-2xl font-medium text-gray-700 mb-2">Dashboard Preview</div>
//               <div className="text-gray-500">Beautiful, intuitive interface that works for everyone</div>
//             </div>
//           </div>
//         </motion.div>
//       </motion.div>
//     </div>
//   );
// }


"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import Link from "next/link";
import { useLanguage } from "./LanguageContext";
import EmailDashboard from "./email-dashboard";

export default function Hero() {
  const { t } = useLanguage();
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 1 } },
  };

  return (
    <>
      <motion.div
        className="flex w-full flex-col items-center justify-center gap-8 text-center"
        initial="hidden"
        variants={containerVariants}
        whileInView="visible"
        viewport={{ once: true }}
      >
        <motion.h1
          className="max-w-2xl text-pretty text-3xl !leading-tight md:text-5xl dark:text-white"
          variants={itemVariants}
        >
          <span className="text-black dark:text-black">{t("hero.title.line1")}</span>{" "}
          <span className="dark:text-polar-500 text-gray-400">{t("hero.title.line2")}</span>
        </motion.h1>
        <motion.p
          className="text-pretty text-sm leading-relaxed max-w-xl text-gray-600"
          variants={itemVariants}
        >
          march connects your tools and uses AI to surface priorities, decisions, and next actions so you can stay focused on what matters.
        </motion.p>

        {/* Background image section with dashboard */}
        <motion.div
          className="relative w-full max-w-4xl mt-8"
          variants={itemVariants}
        >
          <img
            src="/mono_light_distortion_1.jpg"
            alt=""
            className="w-full h-auto object-cover rounded-lg"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <EmailDashboard />
          </div>
        </motion.div>

        {/* Beta signup section */}
        <motion.div
          className="flex flex-col items-center gap-4 mt-12"
          variants={itemVariants}
        >
          <p className="text-gray-500 text-sm">Get notified when we push this to prod.</p>
          <div className="flex items-center">
            <input
              type="email"
              placeholder="Your email address"
              className="px-4 py-2.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-l-md focus:outline-none focus:border-gray-300 w-72"
            />
            <button className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-l-0 border-gray-200 rounded-r-md hover:bg-gray-50 transition-colors">
              subscribe
            </button>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}