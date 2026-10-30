import React from 'react';
import { Link } from 'react-router-dom';

const Terms = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Terms & Conditions - Zim Cars Dealer Agreement</h1>
      <p className="text-sm text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Dealer Eligibility & Verification</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>All dealers must undergo mandatory verification. A valid National ID/Passport and Proof of Address are required.</li>
            <li>Only dealers with legitimate verification profiles will be approved by the platform administrator.</li>
            <li>Providing false information or fraudulent documents will result in immediate account rejection and permanent ban.</li>
            <li>The admin reserves the right to reject any application without explanation.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Fees & Pricing</h2>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Free Trial:</strong> New verified dealers get a 2-month free trial.</li>
            <li><strong>Joining Fee:</strong> $3 USD one-time joining fee (payable after verification or as required).</li>
            <li><strong>Subscription Fee:</strong> $2 USD per month to remain active on the platform.</li>
            <li><strong>Commission:</strong> 3% commission on all sales generated from platform leads.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. Payments</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>All payments are made manually via EcoCash to <strong>0773412018</strong>.</li>
            <li>Dealers must upload valid proof of payment with correct transaction reference and sender name.</li>
            <li>Payments are only approved after verification against the EcoCash statement by the platform administrator.</li>
            <li>False payment proofs will result in account suspension or termination.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Commission & Sales Reporting</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Commission is only applicable to sales that originate from leads generated through the Zim Cars platform.</li>
            <li>Dealers must accurately record all platform-generated sales through their dashboard.</li>
            <li>Attempting to conceal platform sales or falsify sale prices to avoid commission is strictly prohibited.</li>
            <li>All platform sales are subject to admin confirmation before commission is calculated.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Account Status & Suspension</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Accounts that fail to renew subscription after expiry will have their vehicles removed from public search.</li>
            <li>Non-compliant dealers may be suspended or permanently removed from the platform.</li>
            <li>The platform reserves the right to suspend accounts pending investigation of fraudulent activity.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. General</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>These terms may be updated at any time. Continued use of the platform constitutes acceptance of updated terms.</li>
            <li>Dealers are responsible for the accuracy of their listings and all customer interactions.</li>
            <li>Zim Cars acts as a lead generation platform and is not a party to the sale transaction between dealer and buyer.</li>
          </ul>
        </section>
      </div>

      <div className="mt-8">
        <Link to="/become-a-dealer" className="text-blue-600 hover:underline">
          ← Back to Registration
        </Link>
      </div>
    </div>
  );
};

export default Terms;
