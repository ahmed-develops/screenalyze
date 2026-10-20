import { Alert } from 'react-native';
import * as LegacyMediaLibrary from 'expo-media-library/legacy';
import * as ImagePicker from 'expo-image-picker';

export interface RetrievedPhoto {
  uri: string;
  id: string;
  creationTime: number;
  filename?: string;
  base64?: string;
}

export const MediaService = {
  /**
   * Request media library permissions
   */
  async ensurePermissions(): Promise<boolean> {
    try {
      const current = await LegacyMediaLibrary.getPermissionsAsync();
      if (
        current.granted ||
        current.status === 'granted' ||
        current.accessPrivileges === 'all' ||
        current.accessPrivileges === 'limited'
      ) {
        return true;
      }

      const requested = await LegacyMediaLibrary.requestPermissionsAsync();
      return (
        requested.granted ||
        requested.status === 'granted' ||
        requested.accessPrivileges === 'all' ||
        requested.accessPrivileges === 'limited'
      );
    } catch (e) {
      console.warn('Error checking/requesting media permissions', e);
      return false;
    }
  },

  /**
   * Resolves the dedicated system "Screenshots" album.
   * On iOS, this is the smart album containing only device screenshots.
   * On Android, this is the "Screenshots" directory album.
   */
  async getScreenshotsAlbum(): Promise<LegacyMediaLibrary.Album | null> {
    try {
      // 1. Direct fetch by title 'Screenshots'
      const album = await LegacyMediaLibrary.getAlbumAsync('Screenshots');
      if (album) return album;

      // 2. Case-insensitive search across all system albums (including common localizations)
      const albums = await LegacyMediaLibrary.getAlbumsAsync();
      const match =
        albums.find(
          (a) =>
            a.title &&
            /^(screenshots?|capture d'écran|capturas de pantalla|bildschirmfotos)$/i.test(
              a.title.trim()
            )
        ) || albums.find((a) => a.title && /screenshot/i.test(a.title));

      return match || null;
    } catch (e) {
      console.warn('Error resolving Screenshots album:', e);
      return null;
    }
  },

  /**
   * Helper that checks whether an asset is strictly a screenshot.
   */
  isScreenshotAsset(asset: LegacyMediaLibrary.Asset, screenshotsAlbumId?: string): boolean {
    if (screenshotsAlbumId && asset.albumId === screenshotsAlbumId) {
      return true;
    }
    const isSubtype =
      Array.isArray(asset.mediaSubtypes) && asset.mediaSubtypes.includes('screenshot');
    const isName =
      asset.filename && /screenshot|screen_shot|screen-shot/i.test(asset.filename);
    return Boolean(isSubtype || isName);
  },

  /**
   * Finds the latest real screenshot strictly from the device's Screenshots album.
   * NEVER returns non-screenshot camera photos.
   */
  async getLatestScreenshot(): Promise<RetrievedPhoto | null> {
    const hasPermission = await this.ensurePermissions();
    if (!hasPermission) {
      return null;
    }

    try {
      const screenshotsAlbum = await this.getScreenshotsAlbum();

      // Query specifically from the Screenshots album if available
      const options: LegacyMediaLibrary.AssetsOptions = {
        first: 20,
        mediaType: LegacyMediaLibrary.MediaType.photo,
        sortBy: [[LegacyMediaLibrary.SortBy.creationTime, false]],
      };
      if (screenshotsAlbum) {
        options.album = screenshotsAlbum;
      }

      const result = await LegacyMediaLibrary.getAssetsAsync(options);

      if (result.assets && result.assets.length > 0) {
        // Strictly filter for screenshots - do NOT fall back to general camera roll
        const screenshotAsset = result.assets.find((asset) =>
          this.isScreenshotAsset(asset, screenshotsAlbum?.id)
        );

        if (!screenshotAsset) {
          return null;
        }

        // Resolve local file URI on iOS/Android
        let resolvedUri = screenshotAsset.uri;
        try {
          const assetInfo = await LegacyMediaLibrary.getAssetInfoAsync(screenshotAsset, {
            shouldDownloadFromNetwork: true,
          });
          if (assetInfo.localUri) {
            resolvedUri = assetInfo.localUri;
          }
        } catch (errInfo) {
          console.warn('Failed to resolve localUri for asset', errInfo);
        }

        return {
          uri: resolvedUri,
          id: screenshotAsset.id,
          creationTime: screenshotAsset.creationTime,
          filename: screenshotAsset.filename,
        };
      }

      return null;
    } catch (err) {
      console.error('getLatestScreenshot failed', err);
      return null;
    }
  },

  /**
   * Retrieves multiple recent screenshots strictly from the Screenshots album.
   */
  async getRecentScreenshots(count = 5): Promise<RetrievedPhoto[]> {
    const hasPermission = await this.ensurePermissions();
    if (!hasPermission) return [];

    try {
      const screenshotsAlbum = await this.getScreenshotsAlbum();
      const options: LegacyMediaLibrary.AssetsOptions = {
        first: Math.max(count * 3, 25),
        mediaType: LegacyMediaLibrary.MediaType.photo,
        sortBy: [[LegacyMediaLibrary.SortBy.creationTime, false]],
      };
      if (screenshotsAlbum) {
        options.album = screenshotsAlbum;
      }

      const result = await LegacyMediaLibrary.getAssetsAsync(options);
      if (!result.assets || result.assets.length === 0) return [];

      // Strictly only keep genuine screenshot assets
      const filtered = result.assets.filter((asset) =>
        this.isScreenshotAsset(asset, screenshotsAlbum?.id)
      );

      if (filtered.length === 0) return [];

      const selected = filtered.slice(0, count);
      const resolved: RetrievedPhoto[] = [];

      for (const item of selected) {
        let resolvedUri = item.uri;
        try {
          const assetInfo = await LegacyMediaLibrary.getAssetInfoAsync(item, {
            shouldDownloadFromNetwork: true,
          });
          if (assetInfo.localUri) resolvedUri = assetInfo.localUri;
        } catch {
          // fallback to uri
        }
        resolved.push({
          uri: resolvedUri,
          id: item.id,
          creationTime: item.creationTime,
          filename: item.filename,
        });
      }

      return resolved;
    } catch (err) {
      console.error('getRecentScreenshots failed', err);
      return [];
    }
  },

  /**
   * Retrieves all genuine screenshot assets strictly from the device's Screenshots album.
   * Completely excludes general camera roll photos, selfies, and private images.
   */
  async getAllScreenshots(limit = 60): Promise<RetrievedPhoto[]> {
    const hasPermission = await this.ensurePermissions();
    if (!hasPermission) return [];

    try {
      const screenshotsAlbum = await this.getScreenshotsAlbum();
      const options: LegacyMediaLibrary.AssetsOptions = {
        first: Math.max(limit * 2, 60),
        mediaType: LegacyMediaLibrary.MediaType.photo,
        sortBy: [[LegacyMediaLibrary.SortBy.creationTime, false]],
      };
      if (screenshotsAlbum) {
        options.album = screenshotsAlbum;
      }

      const result = await LegacyMediaLibrary.getAssetsAsync(options);
      if (!result.assets || result.assets.length === 0) return [];

      const filtered = screenshotsAlbum
        ? result.assets
        : result.assets.filter((asset) => this.isScreenshotAsset(asset));

      return filtered.slice(0, limit).map((item) => ({
        uri: item.uri,
        id: item.id,
        creationTime: item.creationTime,
        filename: item.filename,
      }));
    } catch (err) {
      console.error('getAllScreenshots failed', err);
      return [];
    }
  },

  /**
   * Resolves the local file URI for a selected asset before processing.
   */
  async resolveAssetLocalUri(photo: RetrievedPhoto): Promise<RetrievedPhoto> {
    try {
      if (photo.uri.startsWith('ph://') || !photo.uri.startsWith('file://')) {
        const assetInfo = await LegacyMediaLibrary.getAssetInfoAsync(photo.id, {
          shouldDownloadFromNetwork: true,
        });
        if (assetInfo.localUri) {
          return {
            ...photo,
            uri: assetInfo.localUri,
          };
        }
      }
    } catch (err) {
      console.warn('Could not resolve asset localUri', err);
    }
    return photo;
  },

  /**
   * Pick a screenshot directly from the photo library.
   * Validates that the picked asset is strictly from the Screenshots album or a genuine screenshot.
   */
  async pickScreenshotFromLibrary(): Promise<RetrievedPhoto | null> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const screenshotsAlbum = await this.getScreenshotsAlbum();

        // Validate that the chosen image is strictly a screenshot
        let isScreenshot = false;
        if (asset.assetId) {
          try {
            const nativeAsset = await LegacyMediaLibrary.getAssetInfoAsync(asset.assetId);
            if (nativeAsset && this.isScreenshotAsset(nativeAsset, screenshotsAlbum?.id)) {
              isScreenshot = true;
            }
          } catch {
            // fallback to filename inspection
          }
        }
        if (!isScreenshot && asset.fileName) {
          isScreenshot = /screenshot|screen_shot|screen-shot/i.test(asset.fileName);
        }

        if (!isScreenshot) {
          Alert.alert(
            'Screenshots Only',
            'Screenalyze only permits selecting screenshots from your gallery. General camera photos and personal pictures are restricted.'
          );
          return null;
        }

        const stableId = asset.assetId || `picked-${Date.now()}`;
        return {
          uri: asset.uri,
          id: stableId,
          creationTime: Date.now(),
          filename: asset.fileName || 'screenshot.jpg',
          base64: asset.base64 || undefined,
        };
      }
      return null;
    } catch (err) {
      console.warn('Error launching image library picker', err);
      return null;
    }
  },

  /**
   * Scans the Screenshots album for unanalyzed screenshots not yet in Screenalyze.
   */
  async getUnanalyzedScreenshots(analyzedIds: Set<string>): Promise<RetrievedPhoto[]> {
    const hasPermission = await this.ensurePermissions();
    if (!hasPermission) return [];

    try {
      const screenshotsAlbum = await this.getScreenshotsAlbum();
      const options: LegacyMediaLibrary.AssetsOptions = {
        first: 60,
        mediaType: LegacyMediaLibrary.MediaType.photo,
        sortBy: [[LegacyMediaLibrary.SortBy.creationTime, false]],
      };
      if (screenshotsAlbum) {
        options.album = screenshotsAlbum;
      }

      const result = await LegacyMediaLibrary.getAssetsAsync(options);
      if (!result.assets || result.assets.length === 0) return [];

      // Strictly filter to genuine screenshots
      const screenshots = result.assets.filter((asset) =>
        this.isScreenshotAsset(asset, screenshotsAlbum?.id)
      );

      const unanalyzed = screenshots.filter((asset) => !analyzedIds.has(asset.id));
      if (unanalyzed.length === 0) return [];

      const resolved: RetrievedPhoto[] = [];
      for (const item of unanalyzed) {
        let resolvedUri = item.uri;
        try {
          const assetInfo = await LegacyMediaLibrary.getAssetInfoAsync(item, {
            shouldDownloadFromNetwork: true,
          });
          if (assetInfo.localUri) resolvedUri = assetInfo.localUri;
        } catch {
          // fallback to uri
        }
        resolved.push({
          uri: resolvedUri,
          id: item.id,
          creationTime: item.creationTime,
          filename: item.filename,
        });
      }

      return resolved;
    } catch (err) {
      console.error('getUnanalyzedScreenshots failed', err);
      return [];
    }
  },
};
