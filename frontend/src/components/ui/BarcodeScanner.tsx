import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from './Button';
import { cn } from '../../utils/helpers';

// ==========================================
// BARCODE SCANNER COMPONENT
// ==========================================

export interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onError?: (error: string) => void;
  className?: string;
  mode?: 'camera' | 'manual';
  placeholder?: string;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  onError,
  className,
  mode: initialMode = 'camera',
  placeholder = 'Scan or enter code...',
}) => {
  const [mode, setMode] = useState<'camera' | 'manual'>(initialMode);
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);

  // Start camera scanning
  const startScanning = async () => {
    if (!scannerDivRef.current) return;

    try {
      setIsScanning(true);

      const scanner = new Html5Qrcode('barcode-scanner');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Success callback
          onScan(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Error callback - ignore most errors as they're just "no code found"
          if (errorMessage.includes('NotFoundException')) {
            return;
          }
        }
      );
    } catch (err: any) {
      console.error('Scanner error:', err);
      if (onError) {
        onError(err.message || 'Failed to start camera');
      }
      setIsScanning(false);
    }
  };

  // Stop camera scanning
  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  // Handle manual input submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      setManualInput('');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Mode Toggle */}
      <div className="flex space-x-2">
        <Button
          variant={mode === 'camera' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            if (mode === 'manual') {
              setMode('camera');
            }
          }}
        >
          📷 Camera
        </Button>
        <Button
          variant={mode === 'manual' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            if (mode === 'camera' && isScanning) {
              stopScanning();
            }
            setMode('manual');
          }}
        >
          ⌨️ Manual
        </Button>
      </div>

      {/* Camera Mode */}
      {mode === 'camera' && (
        <div>
          <div
            id="barcode-scanner"
            ref={scannerDivRef}
            className={cn(
              'rounded-lg overflow-hidden border-2',
              isScanning ? 'border-primary-500' : 'border-gray-300'
            )}
            style={{ minHeight: '300px' }}
          />

          <div className="mt-4 flex justify-center space-x-3">
            {!isScanning ? (
              <Button variant="primary" onClick={startScanning}>
                Start Camera
              </Button>
            ) : (
              <Button variant="danger" onClick={stopScanning}>
                Stop Camera
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Manual Mode */}
      {mode === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div>
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={placeholder}
              className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>
          <Button type="submit" variant="primary" className="w-full">
            Submit Code
          </Button>
        </form>
      )}

      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
        {mode === 'camera' ? (
          <p>
            📱 Point your camera at the barcode. The scanner will automatically
            detect and read the code.
          </p>
        ) : (
          <p>⌨️ Type or paste the code manually and click Submit.</p>
        )}
      </div>
    </div>
  );
};

// ==========================================
// BARCODE INPUT (Simplified version for forms)
// ==========================================

export interface BarcodeInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  onScan?: (code: string) => void;
}

export const BarcodeInput: React.FC<BarcodeInputProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Enter or scan barcode',
  error,
  onScan,
}) => {
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = (code: string) => {
    onChange(code);
    setShowScanner(false);
    if (onScan) {
      onScan(code);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div className="flex space-x-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
            error && 'border-danger-500'
          )}
        />
        <Button
          variant="secondary"
          onClick={() => setShowScanner(!showScanner)}
        >
          📷
        </Button>
      </div>

      {error && <p className="text-sm text-danger-600">{error}</p>}

      {showScanner && (
        <div className="mt-4 p-4 border border-gray-200 rounded-lg">
          <BarcodeScanner
            onScan={handleScan}
            mode="camera"
            placeholder={placeholder}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowScanner(false)}
            className="mt-2 w-full"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};
