"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";

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
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6,
        ease: "easeOut"
      } 
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-4xl mx-auto text-center"
        initial="hidden"
        variants={containerVariants}
        whileInView="visible"
        viewport={{ once: true }}
      >
        <motion.h1
          className="text-4xl md:text-6xl font-bold mb-6 text-gray-900"
          variants={itemVariants}
        >
          Build Better Products,
          <span className="block text-blue-600 mt-2">Faster with March</span>
        </motion.h1>
        
        <motion.p 
          className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto"
          variants={itemVariants}
        >
          An all-in-one platform that helps you build, launch, and grow your SaaS business with powerful tools and insights.
        </motion.p>
        
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 justify-center"
          variants={itemVariants}
        >
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            size="lg"
          >
            Get Started for Free
          </Button>
          <Button 
            variant="outline" 
            className="border-gray-300 text-gray-700 px-8 py-3 text-lg rounded-full hover:bg-gray-50 transition-colors"
            size="lg"
          >
            Book a Demo
          </Button>
        </motion.div>
        
        <motion.div 
          className="mt-16 rounded-xl overflow-hidden shadow-2xl border border-gray-100"
          variants={itemVariants}
        >
          <div className="aspect-video bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-2xl font-medium text-gray-700 mb-2">Dashboard Preview</div>
              <div className="text-gray-500">Beautiful, intuitive interface that works for everyone</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
