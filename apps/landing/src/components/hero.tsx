"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import Link from "next/link";

export default function Hero() {
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
          className="max-w-2xl text-pretty text-3xl !leading-tight md:text-4xl dark:text-white"
          variants={itemVariants}
        >
          <span className="text-black dark:text-black">ai second brain, opinionatedly designed for the</span>{" "}
          <span className="dark:text-polar-500 text-gray-400">rest of us</span>
        </motion.h1>
        <motion.p
          className="text-pretty text-sm leading-relaxed"
          variants={itemVariants}
        >
          no more tedious templates, features or ai, just building blocks for your own productivity space.
        </motion.p>
        <motion.div
          className="flex flex-row items-center gap-x-4"
          variants={itemVariants}
        >
          <Button className="bg-black text-white">
            <Link href="https://app.march.cat/signin">join public beta</Link>
          </Button>
        </motion.div>
      </motion.div>
    </>
  );
}
