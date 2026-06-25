// export-training.ts developed by Bob Tianqi Wei

import * as fabric from "fabric";
import type { DesignWithPages, Page } from "./types";

interface ExportOptions {
  getCanvasForPage?: (pageId: string) => fabric.Canvas | null;
}

function safeName(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "design";
}

function downloadFile(filename: string, url: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  downloadFile(filename, url);
  URL.revokeObjectURL(url);
}

function parseCanvasJson(page: Page): Record<string, unknown> {
  try {
    return JSON.parse(page.canvas_json || "{}");
  } catch {
    return {};
  }
}

async function renderPageImage(
  page: Page,
  width: number,
  height: number,
  canvas?: fabric.Canvas | null,
): Promise<{ imageUrl: string; canvasJson: Record<string, unknown> }> {
  if (canvas) {
    const activeObject = canvas.getActiveObject();
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    const imageUrl = canvas.toDataURL({ format: "png", multiplier: 2, quality: 1 });
    const canvasJson = canvas.toJSON() as Record<string, unknown>;
    if (activeObject) {
      canvas.setActiveObject(activeObject);
      canvas.requestRenderAll();
    }
    return { imageUrl, canvasJson };
  }

  const canvasEl = document.createElement("canvas");
  const staticCanvas = new fabric.StaticCanvas(canvasEl, {
    width,
    height,
    backgroundColor: "#ffffff",
  });
  const canvasJson = parseCanvasJson(page);
  await staticCanvas.loadFromJSON(canvasJson);
  staticCanvas.requestRenderAll();
  const imageUrl = staticCanvas.toDataURL({ format: "png", multiplier: 2, quality: 1 });
  staticCanvas.dispose();
  return { imageUrl, canvasJson };
}

function buildDesignFile(
  design: DesignWithPages,
  pages: Array<{
    page: Page;
    canvasJson: Record<string, unknown>;
    imageFile: string;
  }>,
): Record<string, unknown> {
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    design: {
      id: design.id,
      name: design.name,
      width: design.width,
      height: design.height,
      created_at: design.created_at,
      updated_at: design.updated_at,
    },
    pages: pages.map(({ page, canvasJson, imageFile }) => ({
      id: page.id,
      title: page.title,
      sort_order: page.sort_order,
      width: design.width,
      height: design.height,
      image_file: imageFile,
      canvas_json: canvasJson,
    })),
  };
}

function pageImageFile(designName: string, page: Page, index: number): string {
  const pageName = safeName(page.title || `page-${index + 1}`);
  return `${designName}-${index + 1}-${pageName}.png`;
}

export function exportDesignFile(design: DesignWithPages, options: ExportOptions = {}): void {
  const designName = safeName(design.name);
  const pages = [...design.pages].sort((a, b) => a.sort_order - b.sort_order).map((page, index) => {
    const canvas = options.getCanvasForPage?.(page.id);
    return {
      page,
      canvasJson: canvas ? canvas.toJSON() as Record<string, unknown> : parseCanvasJson(page),
      imageFile: pageImageFile(designName, page, index),
    };
  });

  downloadJson(`${designName}.json`, buildDesignFile(design, pages));
}

export async function exportDesignImages(design: DesignWithPages, options: ExportOptions = {}): Promise<void> {
  const designName = safeName(design.name);
  const pages = [...design.pages].sort((a, b) => a.sort_order - b.sort_order);

  for (const [index, page] of pages.entries()) {
    const imageFile = pageImageFile(designName, page, index);
    const { imageUrl } = await renderPageImage(
      page,
      design.width,
      design.height,
      options.getCanvasForPage?.(page.id),
    );

    downloadFile(imageFile, imageUrl);
  }
}
