<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Tymon\JWTAuth\Facades\JWTAuth;

class GoogleAuthController extends Controller
{
    /**
     * POST /api/auth/google
     * Popup flow (@react-oauth/google): the frontend sends the Google access
     * token obtained from the account the user picked in the popup. We read
     * the Google profile, register the user if new (or find them), and
     * return a JWT session — same payload as email login/register.
     */
    public function loginWithToken(Request $request): JsonResponse
    {
        $request->validate([
            'access_token' => ['required', 'string'],
        ]);

        try {
            $googleUser = Socialite::driver('google')->stateless()->userFromToken($request->access_token);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Jeton Google invalide ou expiré.'], 401);
        }

        if (! $googleUser->getEmail()) {
            return response()->json(['message' => "Impossible de récupérer l'email du compte Google."], 422);
        }

        $user = $this->findOrCreateUser($googleUser);

        if (! $user->isActive()) {
            return response()->json([
                'message' => 'Votre compte est '.$user->status.'. Contactez l\'administration.',
            ], 403);
        }

        $token = JWTAuth::fromUser($user);

        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => auth('api')->factory()->getTTL() * 60,
            'user' => $user,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }

    /**
     * GET /api/auth/google/redirect
     * Legacy server-side redirect flow (kept as fallback).
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

        $user = $this->findOrCreateUser($googleUser);

        if (! $user->isActive()) {
            return $this->toFrontend(['error' => 'Votre compte est '.$user->status.'.']);
        }

        $token = JWTAuth::fromUser($user);

        return $this->toFrontend(['token' => $token]);
    }

    /**
     * Login = the Google email already exists in the database.
     * Register = first time we see this email: create the account from the
     * Google profile (name, email, avatar) with the AutoFormation role.
     */
    private function findOrCreateUser($googleUser): User
    {
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

        return $user;
    }

    private function toFrontend(array $params): RedirectResponse
    {
        $base = rtrim(config('services.frontend_url'), '/');

        return redirect()->away($base.'/auth/callback?'.http_build_query($params));
    }
}
