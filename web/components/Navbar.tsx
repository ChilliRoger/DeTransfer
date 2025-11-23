'use client'

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {SuiLogo} from './Logos';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, Wallet, ChevronDown, LogOut } from 'lucide-react';
import { useCurrentWallet, useWallets, useConnectWallet, useDisconnectWallet, useCurrentAccount } from '@mysten/dapp-kit';

const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const { currentWallet, isConnected, connectionStatus } = useCurrentWallet();
  const wallets = useWallets();
  const { mutate: connectWallet, isPending: isConnecting } = useConnectWallet();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const account = useCurrentAccount();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowWalletMenu(false);
      }
    };

    if (showWalletMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showWalletMenu]);

  const handleNavClick = (e: React.MouseEvent, href: string, hash?: string) => {
    e.preventDefault();
    if (hash) {
      router.push(href + hash);
      // Small timeout to allow view to render before scrolling
      setTimeout(() => {
        const element = document.querySelector(hash);
        element?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      router.push(href);
      if (href === '/') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  const handleConnectWallet = (wallet: any) => {
    connectWallet(
      { wallet },
      {
        onSuccess: () => {
          setShowWalletMenu(false);
        },
        onError: (error) => {
          console.error('Failed to connect wallet:', error);
        },
      }
    );
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setShowWalletMenu(false);
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-start px-6 py-6 md:px-12 md:py-8 pointer-events-none">
      {/* Empty div for spacing balance */}
      {/* <div className="hidden md:block w-54"></div> */}

      {/* Centered Pill Nav */}
      <nav className="pointer-events-auto bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-1 py-1 flex items-center gap-1 shadow-2xl">
        <Link 
          href="/"
          onClick={(e) => handleNavClick(e, '/')}
          className={`px-5 py-2 rounded-full font-sans font-medium text-sm flex items-center gap-2 transition-all ${
            isActive('/')
              ? 'bg-white text-black scale-105 shadow-md' 
              : 'text-gray-300 hover:text-white hover:bg-white/5'
          }`}
        >
          Home
        </Link>
        <Link 
          href="/upload"
          onClick={(e) => handleNavClick(e, '/upload')}
          className={`px-5 py-2 rounded-full font-sans font-medium text-sm flex items-center gap-2 transition-all ${
            isActive('/upload')
              ? 'bg-white text-black scale-105 shadow-md' 
              : 'text-gray-300 hover:text-white hover:bg-white/5'
          }`}
        >
          Upload
        </Link>
        <Link 
          href="/receive"
          onClick={(e) => handleNavClick(e, '/receive')}
          className={`px-5 py-2 rounded-full font-sans font-medium text-sm flex items-center gap-2 transition-all ${
            isActive('/receive')
              ? 'bg-white text-black scale-105 shadow-md' 
              : 'text-gray-300 hover:text-white hover:bg-white/5'
          }`}
        >
          Receive
        </Link>
        
        <Link 
          href="/#roadmap" 
          onClick={(e) => handleNavClick(e, '/', '#roadmap')}
          className="px-5 py-2 text-gray-300 hover:text-white font-sans text-sm font-medium transition-colors hover:bg-white/5 rounded-full"
        >
          Roadmap
        </Link>
        <Link 
          href="/#workflow" 
          onClick={(e) => handleNavClick(e, '/', '#workflow')}
          className="px-5 py-2 text-gray-300 hover:text-white font-sans text-sm font-medium transition-colors hover:bg-white/5 rounded-full"
        >
          Workflow
        </Link>
      </nav>

      {/* Right Side - Faucet & Wallet */}
      <div className="pointer-events-auto flex items-center gap-3">
        {/* Faucet Button */}
        <a
          href="https://faucet.sui.io"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 rounded-full font-sans font-medium text-sm flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 active:scale-95"
          title="Sui Faucet"
        >
          <SuiLogo className="w-8 h-auto" />
          <span className="hidden sm:inline">Faucet</span>
        </a>

        {/* Wallet Connection */}
        <div className="relative" ref={menuRef}>
        {isConnected && account ? (
          <button
            onClick={() => setShowWalletMenu(!showWalletMenu)}
            className={`group px-5 py-2.5 rounded-full font-sans font-medium text-sm flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] ${
              isActive('/bridge') || isActive('/upload')
                ? 'bg-eco-accent text-white ring-2 ring-white/20'
                : 'bg-white text-black hover:bg-gray-200 active:scale-95'
            }`}
          >
            <Wallet size={16} />
            <span>{formatAddress(account.address)}</span>
            <ChevronDown size={14} className={`transition-transform ${showWalletMenu ? 'rotate-180' : ''}`} />
          </button>
        ) : (
          <button
            onClick={() => setShowWalletMenu(!showWalletMenu)}
            disabled={isConnecting || connectionStatus === 'connecting'}
            className={`group px-5 py-2.5 rounded-full font-sans font-medium text-sm flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] ${
              isActive('/bridge') || isActive('/upload')
                ? 'bg-eco-accent text-white ring-2 ring-white/20'
                : 'bg-white text-black hover:bg-gray-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            <Wallet size={16} />
            <span>{isConnecting || connectionStatus === 'connecting' ? 'Connecting...' : 'Connect Wallet'}</span>
            <div className={`rounded-full p-1 transition-transform group-hover:translate-x-1 ${
               isActive('/bridge') || isActive('/upload') ? 'bg-white/20 text-white' : 'bg-black text-white'
            }`}>
              <ArrowRight size={12} />
            </div>
          </button>
        )}

        {/* Wallet Menu Dropdown */}
        {showWalletMenu && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white/95 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-50">
            {isConnected && account ? (
              <div className="p-4 space-y-3">
                <div className="pb-3 border-b border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Connected Wallet</p>
                  <p className="font-semibold text-sm text-black">{currentWallet?.name || 'Wallet'}</p>
                  <p className="text-xs text-gray-600 font-mono mt-1 break-all">{account.address}</p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="w-full px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                >
                  <LogOut size={16} />
                  Disconnect Wallet
                </button>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-sm font-semibold text-black mb-3">Select a wallet to connect</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {wallets.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      <p>No wallets detected</p>
                      <p className="text-xs mt-1">Please install a Sui wallet extension</p>
                    </div>
                  ) : (
                    wallets.map((wallet) => (
                      <button
                        key={wallet.name}
                        onClick={() => handleConnectWallet(wallet)}
                        disabled={isConnecting}
                        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-3 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {wallet.icon && (
                          <img
                            src={wallet.icon}
                            alt={wallet.name}
                            className="w-8 h-8 rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm text-black">{wallet.name}</p>
                          {wallet.version && (
                            <p className="text-xs text-gray-500">v{wallet.version}</p>
                          )}
                        </div>
                        {isConnecting && (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
