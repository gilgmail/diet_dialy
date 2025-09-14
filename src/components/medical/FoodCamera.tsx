'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, Check, AlertTriangle, X, Upload, Image as ImageIcon } from 'lucide-react';
import type { MedicalCondition } from '@/types/medical';

interface FoodCameraProps {
  medicalConditions: MedicalCondition[];
  onPhotoCapture: (photo: File, medicalContext: string) => void;
  className?: string;
}

interface CapturedPhoto {
  file: File;
  url: string;
  timestamp: Date;
}

export function FoodCamera({
  medicalConditions,
  onPhotoCapture,
  className = ''
}: FoodCameraProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<'camera' | 'upload'>('camera');
  const [deviceSupportsCamera, setDeviceSupportsCamera] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check camera support on mount
  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        setDeviceSupportsCamera(hasCamera && !!navigator.mediaDevices.getUserMedia);
      } catch (error) {
        console.warn('Camera enumeration failed:', error);
        setDeviceSupportsCamera(false);
      }
    };

    checkCameraSupport();
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve();
          }
        });
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setError('無法訪問相機。請檢查權限設定或使用檔案上傳功能。');
      setCameraMode('upload');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], `food-photo-${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });

      const url = URL.createObjectURL(blob);

      setCapturedPhoto({
        file,
        url,
        timestamp: new Date()
      });

      // Stop camera after capture
      stopCamera();
    }, 'image/jpeg', 0.9);
  }, [stopCamera]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('請選擇有效的圖片檔案');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('圖片檔案過大，請選擇小於 10MB 的檔案');
      return;
    }

    const url = URL.createObjectURL(file);

    setCapturedPhoto({
      file,
      url,
      timestamp: new Date()
    });

    setError(null);
  }, []);

  const confirmPhoto = useCallback(() => {
    if (!capturedPhoto) return;

    // Generate medical context string
    const medicalContext = [
      `拍攝時間: ${capturedPhoto.timestamp.toLocaleString('zh-TW')}`,
      `醫療狀況: ${medicalConditions.join(', ')}`,
      `需要檢查的項目: 食物安全性、過敏原、營養成分、與醫療狀況的相容性`
    ].join('\n');

    onPhotoCapture(capturedPhoto.file, medicalContext);

    // Clean up
    URL.revokeObjectURL(capturedPhoto.url);
    setCapturedPhoto(null);
  }, [capturedPhoto, medicalConditions, onPhotoCapture]);

  const retakePhoto = useCallback(() => {
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto.url);
      setCapturedPhoto(null);
    }
    setError(null);

    if (cameraMode === 'camera' && deviceSupportsCamera) {
      startCamera();
    }
  }, [capturedPhoto, cameraMode, deviceSupportsCamera, startCamera]);

  const cancelPhoto = useCallback(() => {
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto.url);
      setCapturedPhoto(null);
    }
    stopCamera();
    setError(null);
  }, [capturedPhoto, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (capturedPhoto) {
        URL.revokeObjectURL(capturedPhoto.url);
      }
    };
  }, [stopCamera, capturedPhoto]);

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="border-medical-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-medical-primary" />
            <span>醫療食物拍攝</span>
          </CardTitle>
          <CardDescription>
            拍攝或上傳食物照片，系統將根據您的醫療狀況提供安全性分析
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Mode selector */}
          {deviceSupportsCamera !== false && !capturedPhoto && (
            <div className="flex space-x-2">
              <Button
                variant={cameraMode === 'camera' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCameraMode('camera')}
                disabled={isLoading}
              >
                <Camera className="w-4 h-4 mr-2" />
                相機拍攝
              </Button>
              <Button
                variant={cameraMode === 'upload' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCameraMode('upload')}
                disabled={isLoading}
              >
                <Upload className="w-4 h-4 mr-2" />
                上傳檔案
              </Button>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Medical context info */}
          <div className="p-3 bg-medical-primary/5 rounded-lg border border-medical-primary/20">
            <h4 className="text-sm font-medium mb-2">醫療狀況檢查項目：</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {medicalConditions.map(condition => (
                <li key={condition} className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-medical-primary rounded-full"></span>
                  <span>
                    {condition === 'ibd' && 'IBD友善性、發炎風險評估'}
                    {condition === 'chemotherapy' && '化療期間食品安全、營養密度'}
                    {condition === 'allergy' && '過敏原識別、交叉污染風險'}
                    {condition === 'ibs' && 'FODMAP含量、腸胃刺激性'}
                    {!['ibd', 'chemotherapy', 'allergy', 'ibs'].includes(condition) && `${condition}相關風險評估`}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Camera mode */}
          {cameraMode === 'camera' && !capturedPhoto && (
            <div className="space-y-4">
              {!stream && (
                <div className="text-center py-8">
                  <Button
                    onClick={startCamera}
                    disabled={isLoading || deviceSupportsCamera === false}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                        啟動相機中...
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5 mr-2" />
                        開始拍攝
                      </>
                    )}
                  </Button>
                  {deviceSupportsCamera === false && (
                    <p className="text-sm text-muted-foreground mt-2">
                      設備不支援相機功能，請使用檔案上傳
                    </p>
                  )}
                </div>
              )}

              {stream && (
                <div className="space-y-4">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full rounded-lg bg-black"
                      aria-label="相機預覽畫面"
                    />
                    <div className="absolute inset-0 border-2 border-dashed border-white/50 rounded-lg flex items-center justify-center">
                      <div className="text-white text-sm bg-black/50 px-3 py-1 rounded">
                        將食物置於畫面中央
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={capturePhoto}
                      className="flex-1"
                      size="lg"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      拍攝
                    </Button>
                    <Button
                      onClick={stopCamera}
                      variant="outline"
                      size="lg"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload mode */}
          {cameraMode === 'upload' && !capturedPhoto && (
            <div className="space-y-4">
              <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
                <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  size="lg"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  選擇照片
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  支援 JPG、PNG 格式，檔案大小限制 10MB
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                aria-label="選擇食物照片檔案"
              />
            </div>
          )}

          {/* Preview captured photo */}
          {capturedPhoto && (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={capturedPhoto.url}
                  alt="拍攝的食物照片"
                  className="w-full rounded-lg"
                />
                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {capturedPhoto.timestamp.toLocaleTimeString('zh-TW')}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={confirmPhoto}
                  className="flex-1"
                  size="lg"
                >
                  <Check className="w-5 h-5 mr-2" />
                  確認使用
                </Button>
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  size="lg"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  重拍
                </Button>
                <Button
                  onClick={cancelPhoto}
                  variant="outline"
                  size="lg"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Hidden canvas for photo capture */}
          <canvas
            ref={canvasRef}
            className="hidden"
            aria-hidden="true"
          />
        </CardContent>
      </Card>
    </div>
  );
}