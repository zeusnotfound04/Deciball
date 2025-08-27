"use client"

import { motion } from "framer-motion";
import { Card, CardContent } from "@/app/components/ui/card";
import { signikaNegative, lexend } from "@/lib/font";

export default function TermsOfService() {
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
            Terms of Service
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
                <h2 className="text-2xl font-bold mb-4 text-purple-300">1. Acceptance of Terms</h2>
                <p className="text-gray-300 leading-relaxed">
                  By accessing and using Deciball ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">2. Description of Service</h2>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Deciball is a social music streaming platform that allows users to:
                </p>
                <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                  <li>Create and join music spaces/rooms</li>
                  <li>Stream music from Spotify and YouTube</li>
                  <li>Vote on songs in real-time</li>
                  <li>Add songs to collaborative queues</li>
                  <li>Interact with other users through music requests</li>
                  <li>Receive personalized music recommendations</li>
                  <li>Upload and manage profile content</li>
                </ul>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">3. User Accounts</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">3.1 Account Creation</h3>
                    <p className="text-gray-300 leading-relaxed">
                      You may create an account using email/password, Google, or Spotify authentication. You are responsible for maintaining the confidentiality of your account credentials.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">3.2 Account Responsibility</h3>
                    <p className="text-gray-300 leading-relaxed">
                      You are responsible for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account.
                    </p>
                  </div>
                </div>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">4. Third-Party Services</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">4.1 Spotify Integration</h3>
                    <p className="text-gray-300 leading-relaxed">
                      Our service integrates with Spotify to provide music streaming functionality. Your use of Spotify through our platform is subject to Spotify's Terms of Service and requires a valid Spotify account.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">4.2 YouTube Integration</h3>
                    <p className="text-gray-300 leading-relaxed">
                      We integrate with YouTube for additional music content. Your use of YouTube content is subject to YouTube's Terms of Service.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">4.3 Third-Party Liability</h3>
                    <p className="text-gray-300 leading-relaxed">
                      We are not responsible for the availability, content, or policies of third-party services. Any issues with third-party services should be directed to the respective providers.
                    </p>
                  </div>
                </div>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">5. Acceptable Use Policy</h2>
                <div className="space-y-4">
                  <p className="text-gray-300 leading-relaxed">You agree not to:</p>
                  <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                    <li>Upload, share, or stream copyrighted content without proper authorization</li>
                    <li>Use the service for any illegal or unauthorized purpose</li>
                    <li>Interfere with or disrupt the service or servers</li>
                    <li>Create multiple accounts to manipulate voting systems</li>
                    <li>Harass, abuse, or harm other users</li>
                    <li>Upload malicious files or content</li>
                    <li>Attempt to reverse engineer or hack the service</li>
                    <li>Violate any applicable laws or regulations</li>
                  </ul>
                </div>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">6. Content and Intellectual Property</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">6.1 User Content</h3>
                    <p className="text-gray-300 leading-relaxed">
                      You retain ownership of content you upload (such as profile pictures). By uploading content, you grant us a license to use, store, and display such content in connection with the service.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">6.2 Service Content</h3>
                    <p className="text-gray-300 leading-relaxed">
                      All service features, design, and functionality are owned by Deciball and are protected by copyright and other intellectual property laws.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">6.3 Music Content</h3>
                    <p className="text-gray-300 leading-relaxed">
                      Music content is owned by respective artists, labels, and platforms (Spotify, YouTube). We facilitate access to this content through official APIs and do not claim ownership.
                    </p>
                  </div>
                </div>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">7. Privacy and Data</h2>
                <p className="text-gray-300 leading-relaxed">
                  Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service, to understand our practices regarding the collection and use of your information.
                </p>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">8. Service Availability</h2>
                <div className="space-y-4">
                  <p className="text-gray-300 leading-relaxed">
                    We strive to maintain service availability but do not guarantee uninterrupted access. The service may be temporarily unavailable due to:
                  </p>
                  <ul className="text-gray-300 space-y-2 ml-6 list-disc">
                    <li>Maintenance and updates</li>
                    <li>Third-party service disruptions</li>
                    <li>Technical issues beyond our control</li>
                    <li>Force majeure events</li>
                  </ul>
                </div>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">9. Termination</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">9.1 Termination by You</h3>
                    <p className="text-gray-300 leading-relaxed">
                      You may terminate your account at any time by discontinuing use of the service and deleting your account.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">9.2 Termination by Us</h3>
                    <p className="text-gray-300 leading-relaxed">
                      We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users or us.
                    </p>
                  </div>
                </div>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">10. Disclaimers and Limitation of Liability</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">10.1 Service Disclaimer</h3>
                    <p className="text-gray-300 leading-relaxed">
                      The service is provided "as is" without warranties of any kind. We do not warrant that the service will be uninterrupted, error-free, or secure.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-200 mb-2">10.2 Limitation of Liability</h3>
                    <p className="text-gray-300 leading-relaxed">
                      To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.
                    </p>
                  </div>
                </div>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">11. Changes to Terms</h2>
                <p className="text-gray-300 leading-relaxed">
                  We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of the service constitutes acceptance of the modified terms.
                </p>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">12. Governing Law</h2>
                <p className="text-gray-300 leading-relaxed">
                  These terms shall be governed by and construed in accordance with applicable laws. Any disputes arising from these terms or your use of the service shall be resolved through binding arbitration.
                </p>
              </section>

              <section className={lexend.className}>
                <h2 className="text-2xl font-bold mb-4 text-purple-300">13. Contact Information</h2>
                <p className="text-gray-300 leading-relaxed">
                  If you have any questions about these Terms of Service, please contact us through our support channels or email us at the contact information provided on our platform.
                </p>
              </section>

              <div className="pt-8 border-t border-white/10">
                <p className="text-center text-gray-400 text-sm">
                  These Terms of Service are effective as of {new Date().toLocaleDateString()} and apply to all users of the Deciball platform.
                </p>
              </div>

            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
