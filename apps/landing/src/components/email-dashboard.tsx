"use client";

import React from "react";
import { motion } from "framer-motion";

interface EmailItem {
  id: number;
  title: string;
  description: string;
}

const emailItems: EmailItem[] = [
  {
    id: 1,
    title: "Andre//Derek - Introduction",
    description: "Introduction email from Derek Roth to Andre about site visitor insights.",
  },
  {
    id: 2,
    title: "Profitable Construction SaaS Doing $193K in Annual Profit",
    description: "Profitable Construction SaaS available for acquisition.",
  },
  {
    id: 3,
    title: "回复: Post - Market Surveillance - FCC ID: 2BMXO-MP01",
    description: "Follow-up needed on market surveillance feedback.",
  },
];

export default function EmailDashboard() {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  return (
    <div className="w-full flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* macOS window controls */}
        <div className="flex items-center gap-1.5 px-5 pt-4 pb-5">
          <div className="w-2 h-2 rounded-full bg-[#ff5f57]"></div>
          <div className="w-2 h-2 rounded-full bg-[#febc2e]"></div>
          <div className="w-2 h-2 rounded-full bg-[#28c840]"></div>
        </div>

        {/* Header content */}
        <div className="pl-14 pr-10 pb-5">
          {/* Date with refresh icon */}
          <motion.div className="flex items-center justify-between mb-3" variants={itemVariants}>
            <div className="flex items-center gap-1.5">
              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
              <h2 className="text-xs font-semibold text-gray-900">Monday, January 5</h2>
            </div>
            {/* Refresh/sync icon */}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-gray-400"
            >
              <path
                d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C15.3019 3 18.1885 4.77814 19.7545 7.42909"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M21 3V7.5H16.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>

          {/* Summary text */}
          <motion.p className="text-gray-600 text-[10px] leading-relaxed text-left" variants={itemVariants}>
            Good morning! Today, you have three emails that require your attention, including an
            introduction for Andre and Derek, a discussion on a profitable construction SaaS, and a
            response regarding market surveillance. Prioritizing these items will help keep your
            projects moving forward smoothly.
          </motion.p>
        </div>

        {/* Email list */}
        <div className="pl-14 pr-10 pb-10">
          <div className="space-y-2">
            {emailItems.map((email, index) => (
              <motion.div
                key={email.id}
                className="flex items-center gap-2 py-2 hover:bg-gray-50 cursor-pointer transition-colors group"
                variants={itemVariants}
                custom={index}
              >
                {/* Email icon */}
                <div className="flex-shrink-0">
                  <svg
                    width="12"
                    height="9"
                    viewBox="0 0 20 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-gray-400"
                  >
                    <path
                      d="M2 4L8.10765 8.61216C9.23377 9.42065 10.7662 9.42065 11.8923 8.61216L18 4M4 15H16C17.1046 15 18 14.1046 18 13V3C18 1.89543 17.1046 1 16 1H4C2.89543 1 2 1.89543 2 3V13C2 14.1046 2.89543 15 4 15Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* Email content */}
                <div className="flex-grow min-w-0 text-left">
                  <h3 className="text-gray-900 font-medium text-[10px]">{email.title}</h3>
                  <p className="text-gray-500 text-[10px] mt-0.5">{email.description}</p>
                </div>

                {/* Arrow icon */}
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-gray-400"
                  >
                    <path
                      d="M9 18L15 12L9 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
