// "use client";

// import React from "react";
// import { motion } from "framer-motion";

// export default function Footer() {
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
//     hidden: { opacity: 0 },
//     visible: { opacity: 1, transition: { duration: 1 } },
//   };

//   return (
//     <motion.footer
//       className="w-full py-6 mt-12"
//       initial="hidden"
//       variants={containerVariants}
//       whileInView="visible"
//       viewport={{ once: true }}
//     >
//       <div className="flex justify-center items-center">
//         <motion.div
//           className="text-sm text-gray-500 dark:text-gray-400"
//           variants={itemVariants}
//         >
//           — <a 
//               href="https://github.com/marchhq/march" 
//               target="_blank" 
//               rel="noopener noreferrer" 
//               aria-label="Fork code on GitHub" 
//               className="underline hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
//             >fork</a> code or <a 
//               href="https://x.com/_marchhq" 
//               target="_blank" 
//               rel="noopener noreferrer" 
//               aria-label="Follow on X" 
//               className="underline hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
//             >follow</a> on x
//          </motion.div>
//       </div>
//     </motion.footer>
//   );
// }


"use client";

import React from "react";
import { motion } from "framer-motion";

export default function Footer() {
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
    <motion.footer
      className="w-full py-6 mt-12"
      initial="hidden"
      variants={containerVariants}
      whileInView="visible"
      viewport={{ once: true }}
    >
      <div className="flex justify-center items-center">
        <motion.div
          className="text-sm text-gray-500 dark:text-gray-400"
          variants={itemVariants}
        >
          — <a 
              href="https://github.com/marchhq/march" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Fork code on GitHub" 
              className="underline hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >fork</a> code or <a 
              href="https://x.com/_marchhq" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Follow on X" 
              className="underline hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >follow</a> on x
         </motion.div>
      </div>
    </motion.footer>
  );
}