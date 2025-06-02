/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], filename: string = 'export.csv'): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Download file from server endpoint
 */
export async function downloadFile(endpoint: string, filename: string): Promise<void> {
  try {
    const response = await fetch(endpoint, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

/**
 * Format data for CSV export with localized values
 */
export function formatDataForExport(data: any[]): any[] {
  return data.map(item => ({
    ...item,
    // Format dates
    ...(item.createdAt && { 
      createdAt: new Date(item.createdAt).toLocaleString('pt-BR') 
    }),
    ...(item.startTime && { 
      startTime: new Date(item.startTime).toLocaleString('pt-BR') 
    }),
    ...(item.endTime && { 
      endTime: new Date(item.endTime).toLocaleString('pt-BR') 
    }),
    // Format duration to minutes
    ...(item.duration && { 
      duration: Math.round(item.duration / 60) 
    }),
  }));
}

/**
 * Generate filename with current date
 */
export function generateFilename(base: string, extension: string = 'csv'): string {
  const date = new Date().toISOString().split('T')[0];
  return `${base}_${date}.${extension}`;
}
