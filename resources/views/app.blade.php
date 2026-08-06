<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#237a4b">
        <meta name="application-name" content="EcoVillage.id">
        <meta property="og:image" content="{{ asset('icon/logo.png') }}">
        <meta name="twitter:card" content="summary">
        <meta name="twitter:image" content="{{ asset('icon/logo.png') }}">
        <link rel="manifest" href="/build/manifest.webmanifest">

        {{--
            Arms the scroll-reveal system before the first paint.

            The reveal engine itself cannot run until React has hydrated, which
            is well after the server markup has been painted. Without this the
            engine would hide already-visible content on load, so every page
            began with a flash of the settled layout before its entrance played.
            Marking the document here lets the stylesheet hold reveal targets
            and the page transition at their starting pose from the very first
            frame instead.

            Two escape hatches keep the page readable if the entrance never
            arrives: nothing is armed when the visitor asks for reduced motion,
            and the watchdog releases everything if the bundle has not booted —
            a failed asset must degrade to a plain page, never a blank one.
        --}}
        {{-- Nonce-nya sama dengan yang dipakai tag Vite dan header CSP. --}}
        <script nonce="{{ Vite::cspNonce() }}">
            (function () {
                var root = document.documentElement;

                if (
                    !window.matchMedia ||
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ) {
                    return;
                }

                root.classList.add('reveal-armed');

                window.setTimeout(function () {
                    if (!root.classList.contains('reveal-on')) {
                        root.classList.remove('reveal-armed');
                    }
                }, 2500);
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(0.17 0.025 154);
                color-scheme: dark;
            }
        </style>

        <link rel="icon" href="/icon/logo.png" type="image/png" sizes="1024x1024">
        <link rel="shortcut icon" href="/favicon.ico">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Laravel') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
