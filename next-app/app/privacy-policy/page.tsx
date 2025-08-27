"use client"

import { motion } from "framer-motion";
import { Card, CardContent } from "@/app/components/ui/card";
import { signikaNegative, lexend } from "@/lib/font";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className={`text-4xl md:text-6xl font-bold text-white mb-4 ${signikaNegative.className}`}>
            Privacy Policy
          </h1>
          <p className={`text-xl text-gray-300 ${lexend.className}`}>
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-black/20 backdrop-blur-lg border-white/10 text-white">
            <CardContent className="p-8 space-y-8">
              
              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">1. Introduction</h2>
                <p className="text-gray-300 leading-relaxed">
                  At Deciball, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, process, and protect your information when you use our music streaming platform.
                </p>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">2. Information We Collect</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">2.1 Account Information</h3>
                    <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                      <li>Email address and password (for email registration)</li>
                      <li>Name and profile information from Google or Spotify (for OAuth login)</li>
                      <li>Profile pictures and other content you upload</li>
                      <li>User preferences and settings</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">2.2 Usage Data</h3>
                    <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                      <li>Music listening history and preferences</li>
                      <li>Songs added to queues and voting activity</li>
                      <li>Spaces/rooms created and joined</li>
                      <li>Interaction with other users and content</li>
                      <li>Device information and IP addresses</li>
                      <li>Browser type and operating system</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">2.3 Third-Party Data</h3>
                    <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                      <li>Spotify account information and listening data (with your consent)</li>
                      <li>Google account information (for authentication)</li>
                      <li>YouTube interaction data (when using YouTube integration)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">2.4 Technical Data</h3>
                    <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                      <li>Log files and error reports</li>
                      <li>Performance metrics and analytics</li>
                      <li>WebSocket connection data for real-time features</li>
                      <li>Cached content for improved performance</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">3. How We Use Your Information</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">3.1 Service Provision</h3>
                    <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                      <li>Create and manage your account</li>
                      <li>Provide music streaming and social features</li>
                      <li>Enable real-time voting and queue management</li>
                      <li>Facilitate connections with Spotify and YouTube</li>
                      <li>Store and display your profile information</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">3.2 Personalization and Recommendations</h3>
                    <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                      <li>Provide personalized music recommendations</li>
                      <li>Suggest mood-based tracks and playlists</li>
                      <li>Customize your experience based on preferences</li>
                      <li>Analyze listening patterns for better suggestions</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">3.3 Communication and Support</h3>
                    <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                      <li>Send important service updates and notifications</li>
                      <li>Provide customer support and assistance</li>
                      <li>Respond to your inquiries and feedback</li>
                      <li>Notify about new features and improvements</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">3.4 Security and Compliance</h3>
                    <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                      <li>Protect against fraud and abuse</li>
                      <li>Monitor for suspicious activity</li>
                      <li>Ensure compliance with our Terms of Service</li>
                      <li>Maintain service security and integrity</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">4. Data Storage and Security</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">4.1 Data Storage</h3>
                    <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                      <li>User data is stored in secure PostgreSQL databases via Prisma</li>
                      <li>Profile pictures and files are stored in AWS S3 with appropriate security measures</li>
                      <li>Session data and caching are handled through Redis for performance</li>
                      <li>Real-time data is managed through secure WebSocket connections</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">4.2 Security Measures</h3>
                    <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                      <li>Data encryption in transit and at rest</li>
                      <li>Secure authentication using bcrypt for password hashing</li>
                      <li>JWT tokens for secure session management</li>
                      <li>Regular security audits and updates</li>
                      <li>Access controls and monitoring systems</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">4.3 Data Retention</h3>
                    <p className="text-gray-300 leading-relaxed">
                      We retain your personal data only as long as necessary to provide our services and comply with legal obligations. Account data is deleted within 30 days of account closure, while some anonymous analytics data may be retained longer for service improvement.
                    </p>
                  </div>
                </div>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">5. Third-Party Services and Data Sharing</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">5.1 Spotify Integration</h3>
                    <p className="text-gray-300 leading-relaxed mb-2">
                      When you connect your Spotify account, we access:
                    </p>
                    <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                      <li>Basic profile information (name, email)</li>
                      <li>Music listening preferences and history</li>
                      <li>Playlist data for recommendations</li>
                      <li>Playback control for streaming through our platform</li>
                    </ul>
                    <p className="text-gray-300 leading-relaxed mt-2">
                      This data is used solely to provide music streaming features and is subject to Spotify's Privacy Policy.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">5.2 Google Authentication</h3>
                    <p className="text-gray-300 leading-relaxed">
                      When using Google Sign-In, we receive your name, email, and profile picture. This information is used only for account creation and authentication.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">5.3 YouTube Integration</h3>
                    <p className="text-gray-300 leading-relaxed">
                      We use YouTube's API to search for and stream music content. Your interactions with YouTube content are subject to YouTube's Privacy Policy.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">5.4 AWS S3</h3>
                    <p className="text-gray-300 leading-relaxed">
                      Profile pictures and uploaded files are stored in AWS S3. These files are secured and accessible only through our platform with appropriate authentication.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">5.5 Data Sharing Policy</h3>
                    <p className="text-gray-300 leading-relaxed">
                      We do not sell, trade, or rent your personal information to third parties. We may share anonymized, aggregated data for analytics and service improvement purposes.
                    </p>
                  </div>
                </div>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">6. Your Privacy Rights</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">6.1 Access and Control</h3>
                    <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                      <li>View and edit your profile information</li>
                      <li>Control your privacy settings and preferences</li>
                      <li>Manage third-party account connections</li>
                      <li>Download your data (upon request)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">6.2 Data Deletion</h3>
                    <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                      <li>Delete your account and associated data</li>
                      <li>Remove specific content you've uploaded</li>
                      <li>Disconnect third-party service integrations</li>
                      <li>Request deletion of specific data categories</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">6.3 Communication Preferences</h3>
                    <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                      <li>Opt-out of non-essential communications</li>
                      <li>Control notification settings</li>
                      <li>Manage email preferences</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">7. Cookies and Tracking</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">7.1 Essential Cookies</h3>
                    <p className="text-gray-300 leading-relaxed">
                      We use essential cookies for authentication, session management, and basic functionality. These cannot be disabled without affecting service functionality.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">7.2 Performance and Analytics</h3>
                    <p className="text-gray-300 leading-relaxed">
                      We may use analytics cookies to understand how users interact with our service, helping us improve performance and user experience.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">7.3 Local Storage</h3>
                    <p className="text-gray-300 leading-relaxed">
                      We use browser local storage to save your preferences (such as volume settings and background choices) and improve your experience across sessions.
                    </p>
                  </div>
                </div>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">8. Children's Privacy</h2>
                <p className="text-gray-300 leading-relaxed">
                  Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us to have the information removed.
                </p>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">9. International Data Transfers</h2>
                <p className="text-gray-300 leading-relaxed">
                  Your information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards to protect your privacy.
                </p>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">10. Changes to Privacy Policy</h2>
                <p className="text-gray-300 leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Your continued use of the service constitutes acceptance of the updated policy.
                </p>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">11. Legal Basis for Processing</h2>
                <div className="space-y-4">
                  <p className="text-gray-300 leading-relaxed">We process your personal data based on:</p>
                  <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                    <li><strong>Contract Performance:</strong> To provide the services you've requested</li>
                    <li><strong>Legitimate Interest:</strong> To improve our services and prevent fraud</li>
                    <li><strong>Consent:</strong> For optional features like personalized recommendations</li>
                    <li><strong>Legal Obligation:</strong> To comply with applicable laws and regulations</li>
                  </ul>
                </div>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">12. Contact Us</h2>
                <div className="space-y-4">
                  <p className="text-gray-300 leading-relaxed">
                    If you have any questions about this Privacy Policy or our privacy practices, please contact us:
                  </p>
                  <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                    <li>Through our in-app support channels</li>
                    <li>By email at our support address</li>
                    <li>Through the contact information provided on our platform</li>
                  </ul>
                  <p className="text-gray-300 leading-relaxed">
                    We will respond to privacy-related inquiries within 30 days of receipt.
                  </p>
                </div>
              </section>

              <div className="pt-8 border-t border-white/10">
                <p className="text-center text-gray-400 text-sm">
                  This Privacy Policy is effective as of {new Date().toLocaleDateString()} and applies to all users of the Deciball platform.
                </p>
              </div>

            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
