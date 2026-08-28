import { useEffect, useState } from 'react';
import { allPhotos } from '../lib/photos';
import { restaurants } from '../data/restaurants';
import PhotoThumb from './PhotoThumb';

const nameById = Object.fromEntries(restaurants.map((r) => [r.id, r.name]));

export default function MyPhotos({ onOpenRestaurant }) {
  const [photos, setPhotos] = useState(null);

  useEffect(() => {
    let active = true;
    allPhotos()
      .then((list) => active && setPhotos(list))
      .catch(() => active && setPhotos([]));
    return () => {
      active = false;
    };
  }, []);

  if (photos === null) return null;

  return (
    <div className="detail-block">
      <h3>
        My photos <span className="muted">— {photos.length || 'none yet'}</span>
      </h3>
      {photos.length === 0 ? (
        <p className="muted">
          Photos you add to a spot show up here. They live on this device until
          Firebase Storage is switched on.
        </p>
      ) : (
        <div className="my-photos">
          {photos.map((p) => (
            <button
              key={p.id}
              className="my-photo"
              onClick={() => onOpenRestaurant(p.restaurantId)}
              title={nameById[p.restaurantId] || ''}
            >
              <PhotoThumb photoId={p.id} className="my-photo-img" />
              <span className="my-photo-name">
                {nameById[p.restaurantId] || 'Unknown spot'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
