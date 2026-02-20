'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useI18n } from '@/hooks/useI18n';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  useEffect(() => {
    // Check if Firebase is ready
    if (db && typeof window !== 'undefined') {
      setIsFirebaseReady(true);
    }
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!formData.name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    if (!formData.email.trim()) {
      setError('El email es requerido');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Por favor, ingresa un email válido');
      return;
    }

    if (!formData.message.trim()) {
      setError('El mensaje es requerido');
      return;
    }

    if (formData.message.trim().length < 10) {
      setError('El mensaje debe tener al menos 10 caracteres');
      return;
    }

    if (!isFirebaseReady || !db) {
      setError('El servicio no está disponible. Por favor, intenta más tarde.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save to Firestore
      const contactMessagesRef = collection(db, 'contact_messages');
      await addDoc(contactMessagesRef, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim() || 'Sin asunto',
        message: formData.message.trim(),
        createdAt: serverTimestamp(),
        status: 'new',
      });

      // Success
      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
      });

      // Redirect to home after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err: any) {
      console.error('Error submitting contact form:', err);
      setError(
        'Hubo un error al enviar tu mensaje. Por favor, intenta nuevamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-text-primary mb-4">
              {t('navigation.contact') || 'Contacto'}
            </h1>
            <p className="text-lg text-text-secondary">
              Estamos aquí para ayudarte. Envíanos tu mensaje y nos pondremos en
              contacto contigo lo antes posible.
            </p>
          </div>

          {/* Contact Form */}
          <div className="bg-card shadow-lg rounded-lg p-8 border border-border">
            {success ? (
              <div className="text-center py-8">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-surface-muted/30 mb-4">
                  <svg
                    className="h-8 w-8 text-text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-text-primary mb-2">
                  ¡Mensaje enviado!
                </h2>
                <p className="text-text-secondary mb-4">
                  Gracias por contactarnos. Hemos recibido tu mensaje y te
                  responderemos pronto.
                </p>
                <p className="text-sm text-text-secondary">
                  Serás redirigido a la página principal en unos segundos...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Field */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-text-secondary mb-2"
                  >
                    Nombre *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="input-field w-full px-4 py-2"
                    placeholder="Tu nombre completo"
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-text-secondary mb-2"
                  >
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input-field w-full px-4 py-2"
                    placeholder="tu@email.com"
                  />
                </div>

                {/* Subject Field */}
                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-text-secondary mb-2"
                  >
                    Asunto
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="input-field w-full px-4 py-2"
                    placeholder="¿Sobre qué quieres contactarnos?"
                  />
                </div>

                {/* Message Field */}
                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-text-secondary mb-2"
                  >
                    Mensaje *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleInputChange}
                    className="input-field w-full px-4 py-2 resize-none"
                    placeholder="Escribe tu mensaje aquí..."
                  />
                  <p className="mt-1 text-sm text-text-secondary">
                    Mínimo 10 caracteres
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="rounded-md bg-surface-muted/30 p-4 border border-border">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-text-secondary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-text-primary">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex items-center justify-between pt-4">
                  <Link
                    href="/"
                    className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    ← Volver al inicio
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar mensaje'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Additional Contact Information */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-surface-muted/20 rounded-lg border border-border">
              <div className="mx-auto w-12 h-12 bg-surface-muted/30 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-2">Email</h3>
              <p className="text-sm text-text-secondary">soporte@avocatapp.com</p>
            </div>

            <div className="text-center p-6 bg-surface-muted/20 rounded-lg border border-border">
              <div className="mx-auto w-12 h-12 bg-surface-muted/30 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-2">Teléfono</h3>
              <p className="text-sm text-text-secondary">+34608750040</p>
            </div>

            <div className="text-center p-6 bg-surface-muted/20 rounded-lg border border-border">
              <div className="mx-auto w-12 h-12 bg-surface-muted/30 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-2">Ubicación</h3>
              <p className="text-sm text-text-secondary">Madrid, España</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

