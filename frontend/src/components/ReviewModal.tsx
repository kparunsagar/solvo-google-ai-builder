import React, { useState } from 'react';
import { X, Star, ThumbsUp } from 'lucide-react';
import { api } from '../services/api';

interface ReviewModalProps {
  booking: any;
  onClose: () => void;
  onSuccess: (updatedBooking: any) => void;
}

const REVIEW_TAGS = [
  'Punctual & On-time',
  'Expert Problem Solver',
  'Cleaned Up Work Area',
  'Polite Behavior',
  'Honest Pricing',
  'Followed Safety Measures'
];

export const ReviewModal: React.FC<ReviewModalProps> = ({ booking, onClose, onSuccess }) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Punctual & On-time', 'Expert Problem Solver']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const updated = await api.submitReview(booking.id, {
        customerId: booking.customer_id,
        rating,
        comment,
        tags: selectedTags
      });
      onSuccess(updated);
    } catch (err: any) {
      alert(`Review submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            Rate Your Service Experience
          </h4>
          <button onClick={onClose} style={{ color: '#94a3b8' }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Technician Info */}
          {booking.provider && (
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <img
                src={booking.provider.avatar_url || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150'}
                alt={booking.provider.name}
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 8px' }}
              />
              <h5 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                {booking.provider.name}
              </h5>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {booking.service?.name} in {booking.address_locality}
              </p>
            </div>
          )}

          {/* Interactive Star Rating */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating || rating) >= star;
              return (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  style={{
                    color: active ? '#f59e0b' : '#cbd5e1',
                    transform: active ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Star size={32} fill={active ? '#f59e0b' : 'none'} />
                </button>
              );
            })}
          </div>

          {/* Compliment Tags */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8 }}>
              What went well?
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {REVIEW_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      color: isSelected ? '#2563eb' : '#64748b'
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment box */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
              Feedback / Review (Optional)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others in Sagara about your experience..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#059669',
              color: '#ffffff',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: '0.95rem'
            }}
          >
            {isSubmitting ? 'Submitting Review...' : 'Submit Rating & Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
};
