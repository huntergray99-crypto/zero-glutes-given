import { useEffect, useState } from 'react';
import { getPhotoURL } from '../lib/photos';

export default function PhotoThumb({ photoId, alt = '', className = 'photo-thumb' }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let active = true;
    let objectUrl = null;
    getPhotoURL(photoId).then((u) => {
      if (active) {
        objectUrl = u;
        setUrl(u);
      } else if (u) {
        URL.revokeObjectURL(u);
      }
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId]);

  if (!url) return <span className={`${className} photo-thumb-empty`} />;
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
