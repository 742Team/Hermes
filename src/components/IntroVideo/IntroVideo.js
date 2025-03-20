import React, { useState, useEffect } from 'react';
import './IntroVideo.css';
import introVideo from '../../../src/assets/intro.mp4'; // Assurez-vous que ce chemin est correct

const IntroVideo = ({ onComplete }) => {
  const [isVideoEnded, setIsVideoEnded] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà vu la vidéo
    const hasSeenIntro = localStorage.getItem('has_seen_intro');
    if (hasSeenIntro) {
      // Si l'utilisateur a déjà vu l'intro, passer directement à l'écran suivant
      onComplete();
    }

    // Définir un délai de sécurité pour passer à l'écran suivant même si la vidéo ne se charge pas
    const safetyTimeout = setTimeout(() => {
      onComplete();
    }, 5000); // 5 secondes maximum d'attente

    return () => clearTimeout(safetyTimeout);
  }, [onComplete]);

  const handleVideoEnd = () => {
    setIsVideoEnded(true);
    localStorage.setItem('has_seen_intro', 'true');
    onComplete();
  };

  return (
    <div className={`intro-container ${isVideoEnded ? 'fade-out' : ''}`}>
      <div className="video-wrapper">
        <video
          autoPlay
          muted
          onEnded={handleVideoEnd}
          onError={() => onComplete()} // En cas d'erreur de chargement, passer à l'écran suivant
          className="intro-video"
        >
          <source src={introVideo} type="video/mp4" />
          Votre navigateur ne supporte pas la lecture de vidéos.
        </video>
      </div>
    </div>
  );
};

export default IntroVideo;
