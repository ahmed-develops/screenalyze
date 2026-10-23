import * as FileSystem from 'expo-file-system/legacy';
import * as LegacyMediaLibrary from 'expo-media-library/legacy';
import { ScreenshotAnalysis, ScreenshotCategorization } from '../types';
import { ApiClient } from './apiClient';
import { computeFastImageHash } from '../utils/crypto';

export interface ExecuteActionResult {
  title: string;
  content: string;
  nextFollowUps: string[];
}

export const AIService = {
  /**
   * Converts any image URI (local file://, content://, ph://, remote http/https, or data:)
   * into base64 format for transmission to the FastAPI backend.
   */
  async getImageBase64(imageUri: string, providedBase64?: string): Promise<string> {
    if (providedBase64 && providedBase64.length > 50) {
      return providedBase64;
    }

    if (imageUri.startsWith('data:')) {
      const parts = imageUri.split(',');
      return parts[1] || '';
    }

    // Handle remote web URLs
    if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
      const tempPath = `${FileSystem.cacheDirectory}screen_${Date.now()}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(imageUri, tempPath);
      return await FileSystem.readAsStringAsync(downloadResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    // Handle iOS ph:// photo library URIs
    if (imageUri.startsWith('ph://')) {
      try {
        const assetId = imageUri.replace('ph://', '');
        const assetInfo = await LegacyMediaLibrary.getAssetInfoAsync(assetId, {
          shouldDownloadFromNetwork: true,
        });
        if (assetInfo.localUri) {
          return await FileSystem.readAsStringAsync(assetInfo.localUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
      } catch (err) {
        console.warn('Failed resolving ph:// URI with getAssetInfoAsync', err);
      }
    }

    // Standard local filesystem / cache URI
    return await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  },

  /**
   * Fast, lightweight gatekeeper & categorization engine.
   * Delegates directly to FastAPI backend (POST /api/v1/screenshots/classify).
   */
  async classifyScreenshot(
    imageUri: string,
    preloadedBase64?: string
  ): Promise<ScreenshotCategorization> {
    const base64Data = await this.getImageBase64(imageUri, preloadedBase64);
    if (!base64Data) {
      return {
        isWorthAnalyzing: false,
        category: 'other',
        confidence: 0.1,
        reason: 'Unable to read image bytes',
      };
    }

    const res = await ApiClient.classifyScreenshot(base64Data);
    if (!res.imageHash) {
      res.imageHash = computeFastImageHash(base64Data);
    }
    return res;
  },

  /**
   * Multimodal analysis of screenshot using Sol.
   * Delegates directly to FastAPI backend (POST /api/v1/screenshots/analyze).
   */
  async analyzeScreenshot(
    imageUri: string,
    preloadedBase64?: string,
    customInstruction?: string,
    forceReanalyze?: boolean
  ): Promise<Omit<ScreenshotAnalysis, 'id' | 'imageUri' | 'capturedAt'>> {
    const base64Data = await this.getImageBase64(imageUri, preloadedBase64);
    if (!base64Data) {
      throw new Error('Unable to read image data from screenshot.');
    }

    const result = await ApiClient.analyzeScreenshot(base64Data, customInstruction, forceReanalyze);
    return {
      ...result,
      imageHash: result.imageHash || computeFastImageHash(base64Data),
    };
  },

  /**
   * Action execution: generates masterclass tutorials, deep-dive explanations, or answers.
   * Delegates directly to FastAPI backend (POST /api/v1/actions/execute).
   */
  async executeAction(
    analysis: ScreenshotAnalysis,
    actionOrQuestion: string,
    customPrompt?: string
  ): Promise<ExecuteActionResult> {
    const previousContext = (analysis.generatedContent || [])
      .slice(-2)
      .map((g) => `[Previous Generated Artifact: "${g.title}"]\n${g.content.slice(0, 500)}...`)
      .join('\n\n');

    return await ApiClient.executeAction({
      actionOrQuestion,
      screenshotTitle: analysis.title,
      category: analysis.category,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      customPrompt,
      previousContext: previousContext || undefined,
    });
  },
};
