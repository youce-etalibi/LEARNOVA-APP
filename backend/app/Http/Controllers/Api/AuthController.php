<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    /**
     * POST /api/auth/login
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Les identifiants sont incorrects.'],
            ]);
        }

        if (! $user->isActive()) {
            return response()->json([
                'message' => 'Votre compte est '.$user->status.'. Contactez l\'administration.',
            ], 403);
        }

        $token = JWTAuth::fromUser($user);

        return $this->respondWithToken($token, $user);
    }

    /**
     * POST /api/auth/register  (Auto-formation public learners only)
     */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'status' => 'active',
        ]);

        $user->assignRole('AutoFormation');

        $token = JWTAuth::fromUser($user);

        return $this->respondWithToken($token, $user, 201);
    }

    /**
     * GET /api/auth/me
     */
    public function me(): JsonResponse
    {
        $user = auth('api')->user();

        return response()->json([
            'user' => $user,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }

    /**
     * POST /api/auth/refresh
     */
    public function refresh(): JsonResponse
    {
        $token = auth('api')->refresh();
        $user = auth('api')->user();

        return $this->respondWithToken($token, $user);
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(): JsonResponse
    {
        auth('api')->logout(); // blacklists the token

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    private function respondWithToken(string $token, User $user, int $status = 200): JsonResponse
    {
        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => auth('api')->factory()->getTTL() * 60,
            'user' => $user,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ], $status);
    }
}
