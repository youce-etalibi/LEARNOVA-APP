<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'bio' => ['nullable', 'string'],
            'avatar' => ['nullable', 'string'],
        ]);

        $user->update($data);

        return response()->json($user);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpeg,jpg,png,gif,webp', 'max:2048'],
        ]);

        $this->deleteStoredAvatar($user->avatar);

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar' => '/storage/'.$path]);

        return response()->json($user);
    }

    public function deleteAvatar(): JsonResponse
    {
        $user = auth('api')->user();

        $this->deleteStoredAvatar($user->avatar);
        $user->update(['avatar' => null]);

        return response()->json($user);
    }

    private function deleteStoredAvatar(?string $avatar): void
    {
        if ($avatar && str_starts_with($avatar, '/storage/avatars/')) {
            Storage::disk('public')->delete(substr($avatar, strlen('/storage/')));
        }
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Le mot de passe actuel est incorrect.'],
            ]);
        }

        $user->update(['password' => $data['password']]);

        return response()->json(['message' => 'Mot de passe mis à jour.']);
    }
}
