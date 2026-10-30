import { useEffect, useRef } from "react";
import { Camera, X } from "lucide-react";

const MAX_PHOTOS = 6;
const MAX_SIZE = 10 * 1024 * 1024;

/**
 * Optional photo picker for the handover inspection.
 * Photos are NOT required - the valet adds them only when something
 * looks off. On phones the button opens the camera directly.
 *
 *   photos     [{ file, previewUrl }]
 *   setPhotos  state setter
 *   onError    (message) => void
 *   checkInPhotos  [{ id, photo_url }] shown for comparison
 */
const HandoverPhotos = ({ photos, setPhotos, onError, checkInPhotos = [] }) => {
  const inputRef = useRef(null);
  const photosRef = useRef(photos);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // free preview URLs when the picker goes away
  useEffect(
    () => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)),
    []
  );

  const handleChange = (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = "";
    const next = [...photos];

    for (const file of picked) {
      if (!file.type.startsWith("image/")) {
        onError?.(`${file.name}: only image files are allowed.`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        onError?.(`${file.name}: photo is larger than 10 MB.`);
        continue;
      }
      if (next.length >= MAX_PHOTOS) {
        onError?.(`You can add up to ${MAX_PHOTOS} photos.`);
        break;
      }
      next.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    setPhotos(next);
  };

  const remove = (index) => {
    URL.revokeObjectURL(photos[index].previewUrl);
    setPhotos(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="handover-photos">
      {checkInPhotos.length > 0 && (
        <div className="handover-photos-block">
          <strong>Photos taken at check-in</strong>
          <div className="handover-photo-grid">
            {checkInPhotos.map((p) => (
              <a key={p.id} href={p.photo_url} target="_blank" rel="noreferrer">
                <img src={p.photo_url} alt="Check-in" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="handover-photos-block">
        <strong>Handover photos <small>(optional - add only if something looks off)</small></strong>

        {photos.length > 0 && (
          <div className="handover-photo-grid">
            {photos.map((p, i) => (
              <div className="handover-photo-item" key={p.previewUrl}>
                <img src={p.previewUrl} alt={`Handover ${i + 1}`} />
                <button type="button" onClick={() => remove(i)} aria-label="Remove photo">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="secondary-action handover-add-photo"
          onClick={() => inputRef.current?.click()}
          disabled={photos.length >= MAX_PHOTOS}
        >
          <Camera size={16} />
          Add photo
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

export default HandoverPhotos;
