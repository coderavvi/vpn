import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function VpnStatusBanner() {
  const [vpnStatus, setVpnStatus] = useState(null);

  const checkVpnStatus = async () => {
    try {
      const response = await api.get('/auth/vpn-status');
      setVpnStatus(response.data);
    } catch (err) {
      setVpnStatus({
        vpn_connected: false,
        client_ip: 'Unknown',
        message: 'Could not determine VPN status',
      });
    }
  };

  useEffect(() => {
    // Initial check
    checkVpnStatus();

    // Poll every 30 seconds
    const intervalId = setInterval(checkVpnStatus, 30000);

    return () => clearInterval(intervalId);
  }, []);

  if (!vpnStatus) {
    return null;
  }

  if (vpnStatus.vpn_connected) {
    return (
      <div className="w-full bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-300 py-1.5 px-4 text-center text-xs font-semibold flex items-center justify-center space-x-2 tracking-wide transition-colors">
        <span>🔒 VPN Connected — {vpnStatus.client_ip}</span>
      </div>
    );
  }

  return (
    <div className="w-full bg-amber-950/90 border-b border-amber-500/40 text-amber-300 py-1.5 px-4 text-center text-xs font-semibold flex items-center justify-center space-x-2 tracking-wide transition-colors">
      <span>⚠️ VPN Not Connected — Portal access will be blocked</span>
    </div>
  );
}
