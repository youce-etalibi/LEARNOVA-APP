<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Tymon\JWTAuth\Facades\JWTAuth;

class GoogleAuthController extends Controller
{
    /**
     * GET /api/auth/google/redirect
     * Kicks off the Google OAuth flow.
     */
    public function redirect(): RedirectResponse
    {
        if (! config('services.google.client_id')) {
            return $this->toFrontend(['error' => 'La connexion Google n\'est pas encore configurée.']);
        }

        return Socialite::driver('google')->stateless()->redirect();
    }

    /**
     * GET /api/auth/google/callback
     * Google redirects back here; we create/find the user, issue a JWT,
     * then bounce to the frontend with the token.
     */
    public function callback(): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Throwable $e) {
            return $this->toFrontend(['error' => 'Échec de l\'authentification Google.']);
        }

        $user = User::where('email', $googleUser->getEmail())->first();

        if (! $user) {
            $user = User::create([
                'name' => $googleUser->getName() ?: 'Utilisateur Google',
                'email' => $googleUser->getEmail(),
                'password' => Str::random(32), // random; login stays via Google
                'avatar' => $googleUser->getAvatar(),
                'status' => 'active',
                'email_verified_at' => now(),
            ]);
            $user->assignRole('AutoFormation');
        }

        if (! $user->isActive()) {
            return $this->toFrontend(['error' => 'Votre compte est '.$user->status.'.']);
        }

        $token = JWTAuth::fromUser($user);

        return $this->toFrontend(['token' => $token]);
    }

    private function toFrontend(array $params): RedirectResponse
    {
        $base = rtrim(config('services.frontend_url'), '/');

        return redirect()->away($base.'/auth/callback?'.http_build_query($params));
    }
}
