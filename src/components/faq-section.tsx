"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is 0cto and how does it work?",
    answer:
      "0cto is a powerful collaboration platform designed for developers and teams. It seamlessly integrates with GitHub to provide real-time collaboration, project management, and code review tools. Simply sign in with your GitHub account, connect your repositories, and start collaborating with your team instantly.",
  },
  {
    question: "Do I need a GitHub account to use 0cto?",
    answer:
      "Yes, 0cto uses GitHub OAuth for authentication, which provides a secure and seamless sign-in experience. This integration also allows us to sync with your repositories, issues, and pull requests automatically.",
  },
  {
    question: "How secure is my code and data with 0cto?",
    answer:
      "Security is our top priority. We use GitHub's OAuth for authentication, implement end-to-end encryption, comply with SOC 2 Type II standards, and offer features like two-factor authentication. We never store your code - we only access metadata and collaboration features. Your repositories remain securely on GitHub.",
  },
  {
    question: "Can I use 0cto with private repositories?",
    answer:
      "Yes! 0cto works seamlessly with both public and private repositories. Our Pro and Team plans offer full support for private repositories with enhanced privacy and security features.",
  },
  {
    question: "What kind of support do you provide?",
    answer:
      "We provide community support for Free users, priority email support for Pro users, and 24/7 dedicated support for Team plan subscribers. We also offer comprehensive documentation, tutorials, and an active community forum.",
  },
  {
    question: "Can I change my plan anytime?",
    answer:
      "Yes, you can upgrade or downgrade your plan at any time. When you upgrade, you'll be charged the prorated difference immediately. When you downgrade, the change will take effect at your next billing cycle.",
  },
  {
    question: "Is there a free plan available?",
    answer:
      "Yes! We offer a generous free plan that includes up to 3 projects, 5GB storage, and access to basic features. It's perfect for individual developers and small projects. You can upgrade anytime as your needs grow.",
  },
  {
    question: "Can I integrate 0cto with other development tools?",
    answer:
      "Absolutely! 0cto integrates with popular development tools including Slack, Discord, Jira, Trello, VS Code, and many more. Our API also allows for custom integrations to fit your specific workflow needs.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 px-4 bg-background">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-16">
          <motion.h2
            className="text-4xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Frequently Asked Questions
          </motion.h2>
          <motion.p
            className="text-xl text-gray-300 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Everything you need to know about 0cto. Can&apos;t find what
            you&apos;re looking for? Contact our support team.
          </motion.p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              className="border border-border/20 rounded-lg bg-card/50 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <button
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors rounded-lg"
                onClick={() => toggleFAQ(index)}
              >
                <span className="text-lg font-medium text-white pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>

              <motion.div
                initial={false}
                animate={{
                  height: openIndex === index ? "auto" : 0,
                  opacity: openIndex === index ? 1 : 0,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-4">
                  <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
