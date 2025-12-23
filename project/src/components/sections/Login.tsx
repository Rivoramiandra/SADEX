import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, User, Eye, EyeOff, CheckCircle } from 'lucide-react';

type UserType = 'agent' | 'admin';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<UserType>('agent');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Simulation d'authentification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Vérification basique
      if (!email || !password) {
        throw new Error('Veuillez remplir tous les champs');
      }

      if (!email.includes('@')) {
        throw new Error('Email invalide');
      }

      // Stocker le type d'utilisateur dans le localStorage
      localStorage.setItem('userType', userType);
      localStorage.setItem('isAuthenticated', 'true');

      // Afficher le modal de succès au lieu de rediriger directement
      const roleText = userType === 'admin' ? 'Administrateur' : 'Agent';
      setSuccessMessage(`Connexion réussie en tant que ${roleText}`);
      setShowSuccessModal(true);
      setLoading(false);

    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
      setLoading(false);
    }
  };

  const handleContinue = () => {
    setShowSuccessModal(false);
    // Redirection selon le type d'utilisateur
    if (userType === 'admin') {
      navigate('/dashboard');
    } else {
      navigate('/agent-dashboard');
    }
  };

  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        handleContinue();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  return (
    <>
      {/* Modal de confirmation de connexion réussie */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all duration-300 scale-100">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Connexion réussie !
              </h3>
              <p className="text-gray-600">
                {successMessage}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Vous allez être redirigé vers votre tableau de bord...
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="h-screen flex bg-white overflow-hidden">
        {/* Partie gauche avec l'image et le logo centré */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20 z-10" />
          
          {/* Image de fond */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{
              backgroundImage: "url('/images/Protection-contre-les-inondations.png')"
            }}
          />
          
          <div className="relative z-20 flex items-center justify-center h-full p-12 text-white">
            <img 
              src="/images/APIPA_blue_white_bg.PNG" 
              alt="SADEXLST Logo" 
              className="w-45 h-45 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.parentElement?.querySelector('.logo-fallback');
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
          </div>
        </div>

        {/* Partie droite avec le formulaire - TOUT EN BLANC */}
        <div className="flex-1 flex items-center justify-center  bg-white overflow-y-auto">
          <div className="w-full max-w-md">
            {/* Logo pour mobile */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Lock className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="text-center">
                {/* <h1 className="text-2xl font-bold text-gray-800">SADEXLST</h1>
                <p className="text-gray-600 text-sm">Surveillance & Contrôle</p> */}
              </div>
            </div>

            {/* Formulaire sans ombre ni bordure */}
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Connexion</h2>
                <p className="text-gray-600">Accédez à votre espace personnel</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    </div>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Sélection du type d'utilisateur - Blanc avec bordure claire */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Je suis
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setUserType('agent')}
                      className={`p-4 border transition-all duration-200 relative overflow-hidden ${
                        userType === 'agent'
                          ? 'border-blue-500 bg-white text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {userType === 'agent' && (
                        <div className="absolute top-3 right-3">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="flex justify-center mb-2">
                          <div className={`p-2 rounded-lg ${
                            userType === 'agent' ? 'bg-blue-50' : 'bg-gray-50'
                          }`}>
                            <User className={`w-6 h-6 ${
                              userType === 'agent' ? 'text-blue-600' : 'text-gray-600'
                            }`} />
                          </div>
                        </div>
                        <div className="font-semibold">Agent</div>
                        <div className="text-xs mt-1">Rapport de descente</div>
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setUserType('admin')}
                      className={`p-4 border transition-all duration-200 relative overflow-hidden ${
                        userType === 'admin'
                          ? 'border-blue-500 bg-white text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {userType === 'admin' && (
                        <div className="absolute top-3 right-3">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="flex justify-center mb-2">
                          <div className={`p-2 rounded-lg ${
                            userType === 'admin' ? 'bg-blue-50' : 'bg-gray-50'
                          }`}>
                            <User className={`w-6 h-6 ${
                              userType === 'admin' ? 'text-blue-600' : 'text-gray-600'
                            }`} />
                          </div>
                        </div>
                        <div className="font-semibold">Administrateur</div>
                        <div className="text-xs mt-1">Administration</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Champ Email - Blanc avec bordure claire */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Adresse email
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <Mail className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 focus:border-blue-500 transition-all duration-200 bg-white"
                      placeholder="votre@email.com"
                      required
                    />
                  </div>
                </div>

                {/* Champ Mot de passe - Blanc avec bordure claire */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 focus:border-blue-500 transition-all duration-200 bg-white"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <a href="#" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      Mot de passe oublié ?
                    </a>
                  </div>
                </div>

                {/* Bouton de connexion - Simple et épuré */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-4 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Connexion en cours...</span>
                    </div>
                  ) : (
                    'Se connecter'
                  )}
                </button>
              </form>

              {/* Informations supplémentaires */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-gray-600 text-sm">
                    <span className="ml-2 text-green-600 font-medium">
                      Système opérationnel
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}